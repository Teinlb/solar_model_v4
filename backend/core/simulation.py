import copy
from typing import List

from backend.models import Config, SimState
from backend.core.physics import calc_net_power

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
        
        # Initialize state (t=0), velocity will be overridden
        self.state = SimState(
            time=0.0,
            distance=0.0,
            velocity=0.0,
            energy=config.car.battery_capacity * self.cfg.car.available_capacity / 100, # Start with available capacity
            last_power_demand=0.0,
            last_power_supply=0.0
        )
        
        # Pre-allocate list for performance
        self.history: List[SimState] = []


    def run_constant(self):
        # Positive net_power = Charging (Supply > Demand)
        # Negative net_power = Discharging (Demand > Supply)
        net_power = calc_net_power(
            speed_m_s=self.state.velocity,
            acceleration_m_s2=self.state.acceleration,
            car=self.cfg.car,
            env=self.cfg.env
        )

        if net_power < 0:
            self.state.time = self.state.energy / net_power
        else:
            self.state.time = self.cfg.sim.duration

        self.state.power = net_power

        self.history.append(copy.copy(self.state))


    def run_cycle(self):
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
        
        while self.state.time <= max_time and self.state.energy > 0: # + cycle over
            # Positive net_power = Charging (Supply > Demand)
            # Negative net_power = Discharging (Demand > Supply)
            net_power = calc_net_power(
                speed_m_s=self.state.velocity,
                acceleration_m_s2=self.state.acceleration,
                car=car_cfg,
                env=env_cfg
            )

            # Battery State Logic
            current_energy = self.state.energy
            # Check if battery is already full
            if net_power > 0 and current_energy >= battery_capacity:
                # Battery full: Excess solar energy is wasted / dumped
                actual_power_change = 0.0
            else:
                # Battery accepts charge or discharge as normal
                actual_power_change = net_power

            # Update physical state variables based on time step (dt)
            self.state.energy += actual_power_change * dt
            self.state.distance += self.state.velocity * dt
            self.state.time += dt

            # Record state snapshot
            self.history.append(copy.copy(self.state))

        # Remove the last state if simulation ended with empty battery
        if self.history and self.history[-1].energy <= 0:
            self.history.pop()

        print(f"Simulation stopped: t={self.state.time:.1f}s")
    
    
    def run(self) -> List[SimState]:
        """
        Executes the simulation loop until duration is reached or battery is empty.
        
        Returns:
            A list of SimState objects representing the simulation history.
        """

        if self.cfg.profile.type == "constant":
            self.state.velocity = self.cfg.profile.target_speed
            self.run_constant(self)
        elif self.cfg.profile.type == "cycle":
            self.run_cycle(self)
        
        return self.history