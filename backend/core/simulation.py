import copy
from typing import List

from backend.core.physics import calc_net_power
from backend.models import Config, SimState
from backend.helpers.profile_loader import load_drive_cycle

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
            time=0,
            distance=0.0,
            velocity=0.0,
            energy=config.car.battery_capacity * self.cfg.car.available_capacity / 100, # Start with available capacity
            power=0.0,
        )
        
        # Pre-allocate list for performance
        self.history: List[SimState] = []


    def run_constant(self):
        self.state.velocity = self.cfg.profile.target_speed

        # Positive net_power = Charging (Supply > Demand)
        # Negative net_power = Discharging (Demand > Supply)
        net_power = calc_net_power(
            speed_m_s=self.state.velocity,
            acceleration_m_s2=self.state.acceleration,
            car=self.cfg.car,
            env=self.cfg.env
        )

        if net_power < 0:
            # Discharging: calculate how long until battery empty
            # time = energy / |net_power|
            self.state.time = int(self.state.energy / abs(net_power))
        else:
            # Charging or balanced: use configured duration
            self.state.time = int(self.cfg.sim.duration)

        # Calculate distance traveled at constant velocity
        self.state.distance = self.state.velocity * self.state.time

        # Update energy based on net_power and time
        energy_change = net_power * self.state.time
        self.state.energy += energy_change
        
        # Clamp energy to valid range [0, battery_capacity]
        self.state.energy = max(0, min(self.state.energy, self.cfg.car.battery_capacity))

        self.state.power = net_power

        self.history.append(copy.copy(self.state))


    def run_cycle(self):
        """
        Executes the simulation loop until duration is reached or battery is empty.
        
        Returns:
            A list of SimState objects representing the simulation history.
        """

        cycle = load_drive_cycle(self.cfg.profile.ref)

        max_time = min(self.cfg.sim.duration, len(cycle) - 1)
        battery_capacity = self.cfg.car.battery_capacity
        
        # Load sub-configs for physics functions
        car_cfg = self.cfg.car
        env_cfg = self.cfg.env
        
        while self.state.time <= max_time and self.state.energy > 0:
            self.state.velocity = cycle[self.state.time][1]
            self.state.acceleration = cycle[self.state.time][2]

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
            if net_power > 0 and current_energy + net_power >= battery_capacity:
                # Battery full: Excess solar energy is wasted / dumped
                actual_power_change = 0.0
            else:
                # Battery accepts charge or discharge as normal
                actual_power_change = net_power

            # Update physical state variables
            self.state.energy += actual_power_change
            self.state.distance += self.state.velocity
            self.state.time += 1
            self.state.power = net_power

            # Record state snapshot
            self.history.append(copy.copy(self.state))

        # Remove the last state if simulation ended with empty battery
        if self.state.energy <= 0:
            if self.history:
                self.history.pop()
        else:
            factor = self.state.energy / (self.history[0].energy - self.state.energy)

            self.state.time *= factor
            self.state.distance *= factor
            self.state.energy = 0.0

            self.history.append(copy.copy(self.state))

        print(f"Simulation stopped: t={self.state.time:.1f}s")
    
    
    def run(self) -> List[SimState]:
        """
        Executes the simulation loop until duration is reached or battery is empty.
        
        Returns:
            A list of SimState objects representing the simulation history.
        """

        if self.cfg.profile.type == "constant":
            self.run_constant()
        elif self.cfg.profile.type == "cycle":
            self.run_cycle()
        
        return self.history