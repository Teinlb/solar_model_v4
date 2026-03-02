import copy
from typing import List

from backend.models import Config, SimState
from backend.core.physics import calc_power_demand, calc_power_supply

class Simulation:
    """
    Core simulation engine. 
    Manages the time loop, state integration, and energy balancing.
    """

    def __init__(self, config: Config):
        """
        Initialize the simulator with a frozen configuration.
        """
        self.cfg = config
        print(f"Simulation initialized with config: {self.cfg}")
        
        # Initialize state (t=0)
        # We start with the battery fully charged (Joules)
        self.state = SimState(
            time=0.0,
            distance=0.0,
            velocity=config.car.target_speed,
            energy=config.car.battery_capacity * self.cfg.car.available_capacity / 100, # Start with available capacity
            last_power_demand=0.0,
            last_power_supply=0.0
        )
        
        # Pre-allocate list for performance
        self.history: List[SimState] = []

    def run(self) -> List[SimState]:
        """
        Executes the simulation loop until duration is reached or battery is empty.
        
        Returns:
            A list of SimState objects representing the simulation history.
        """

        # Caching constants locally improves performance in tight loops.
        dt = self.cfg.sim.time_step
        max_time = self.cfg.sim.duration
        battery_capacity = self.cfg.car.battery_capacity
        
        # Load sub-configs for physics functions
        car_cfg = self.cfg.car
        env_cfg = self.cfg.env
        
        # Retrieve target parameters (could be dynamic in future versions)
        slope = env_cfg.slope

        while self.state.time <= max_time:
            # power demand (W)
            power_out = calc_power_demand(
                speed_m_s=self.state.velocity,
                slope_rad=slope,
                acceleration_m_s2=0.0, # Simple steady-state sim
                car=car_cfg,
                env=env_cfg
            )

            # power supply (W) - includes solar and regenerative braking
            power_in = calc_power_supply(
                irradiance_w_m2=env_cfg.solar_irradiance,
                speed_m_s=self.state.velocity,
                acceleration_m_s2=0.0,  # Simple steady-state sim
                car=car_cfg
            )

            # Positive net_power = Charging (Supply > Demand)
            # Negative net_power = Discharging (Demand > Supply)
            net_power = power_in - power_out

            # Battery State Logic
            current_energy = self.state.energy
            # CASE A: Charging (Net flow is positive)
            if net_power > 0:
                # Check if battery is already full
                if current_energy >= battery_capacity:
                    # Battery full: Excess solar energy is wasted / dumped
                    actual_power_change = 0.0
                else:
                    # Battery accepts charge
                    actual_power_change = net_power
            # CASE B: Discharging (Net flow is negative)
            else:
                # Check if battery is empty
                if current_energy <= 0:
                    break # Stop simulation
                else:
                    # Battery delivers power
                    actual_power_change = net_power

            # Update physical state variables based on time step (dt)
            self.state.energy += actual_power_change * dt
            self.state.distance += self.state.velocity * dt
            self.state.time += dt

            # Update logging fields (for analysis later)
            self.state.last_power_demand = power_out
            self.state.last_power_supply = power_in

            # Record state snapshot
            self.history.append(copy.copy(self.state))

        # Remove the last state if simulation ended with empty battery
        if self.history and self.history[-1].energy <= 0:
            self.history.pop()

        print(f"Simulation stopped: t={self.state.time:.1f}s")
        
        return self.history