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
        
        # Initialize state (t=0). velocity will be overridden by
        # profile logic below.
        self.state = SimState(
            time=0.0,
            distance=0.0,
            velocity=0.0,
            energy=config.car.battery_capacity * self.cfg.car.available_capacity / 100, # Start with available capacity
            last_power_demand=0.0,
            last_power_supply=0.0
        )
        
        # history list; may be large for cycle profiles but is kept for
        # backwards compatibility with earlier versions that returned
        # detailed step-by-step states.
        self.history: List[SimState] = []

        # --- profile handling ------------------------------------------------
        self._profile_type = getattr(self.cfg.profile, "type", "constant")
        if self._profile_type not in ("constant", "cycle"):
            raise ValueError(f"Unsupported profile type '{self._profile_type}'")

        # constant-speed values
        self._constant_speed = None  # type: ignore[assignment]
        # cycle-speed values
        self._cycle_data: List[tuple] = []
        self._cycle_length = 0
        self._cycle_energy_delta = 0.0

        if self._profile_type == "constant":
            # constant target speed from profile or car config fallback
            self._constant_speed = getattr(self.cfg.profile, "target_speed", None) \
                or self.cfg.car.target_speed
            self.state.velocity = self._constant_speed

        else:  # cycle profile
            from backend.helpers.profile_loader import load_drive_cycle

            ref = getattr(self.cfg.profile, "ref", None)
            if not ref:
                raise ValueError("Cycle profile requires a 'ref' CSV path")

            self._cycle_data = load_drive_cycle(ref)
            self._cycle_length = len(self._cycle_data)

            # Ensure time step matches drive-cycle granularity
            if self.cfg.sim.time_step != 1.0:
                print("warning: forcing sim.time_step to 1.0 for cycle profile")
                self.cfg.sim.time_step = 1.0

            # compute net energy change over one cycle; used for fast-path
            # calculations later
            total = 0.0
            car_cfg = self.cfg.car
            env_cfg = self.cfg.env
            slope = env_cfg.slope
            for _, speed, accel in self._cycle_data:
                p_out = calc_power_demand(
                    speed_m_s=speed,
                    slope_rad=slope,
                    acceleration_m_s2=accel,
                    car=car_cfg,
                    env=env_cfg,
                )
                p_in = calc_power_supply(
                    irradiance_w_m2=env_cfg.solar_irradiance,
                    speed_m_s=speed,
                    acceleration_m_s2=accel,
                    car=car_cfg,
                )
                total += (p_in - p_out) * 1.0  # dt == 1
            self._cycle_energy_delta = total

            # initialize state according to first entry
            _, first_speed, _ = self._cycle_data[0]
            self.state.velocity = first_speed

    # ------------------------------------------------------------------
    # optimized simulation helpers
    # ------------------------------------------------------------------
    def _simulate_constant(self) -> List[SimState]:
        """Fast-path for constant-speed profile."""
        car_cfg = self.cfg.car
        env_cfg = self.cfg.env
        battery_capacity = self.cfg.car.battery_capacity
        slope = env_cfg.slope

        speed = self._constant_speed
        demand = calc_power_demand(
            speed_m_s=speed,
            slope_rad=slope,
            acceleration_m_s2=0.0,
            car=car_cfg,
            env=env_cfg,
        )
        supply = calc_power_supply(
            irradiance_w_m2=env_cfg.solar_irradiance,
            speed_m_s=speed,
            acceleration_m_s2=0.0,
            car=car_cfg,
        )
        net = supply - demand

        start_energy = self.state.energy
        history: List[SimState] = [copy.copy(self.state)]

        if net < 0:
            time_to_empty = -start_energy / net
            end_time = min(time_to_empty, self.cfg.sim.duration)
            end_distance = speed * end_time
            end_energy = start_energy + net * end_time
        elif net > 0:
            if start_energy >= battery_capacity:
                end_time = 0.0
                end_distance = 0.0
                end_energy = start_energy
            else:
                time_to_full = (battery_capacity - start_energy) / net
                end_time = min(time_to_full, self.cfg.sim.duration)
                end_distance = speed * end_time
                end_energy = start_energy + net * end_time
        else:
            end_time = self.cfg.sim.duration
            end_distance = speed * end_time
            end_energy = start_energy

        final = SimState(
            time=end_time,
            distance=end_distance,
            velocity=speed,
            energy=end_energy,
            last_power_demand=demand,
            last_power_supply=supply,
        )
        if end_time > 0:
            history.append(final)

        print(f"Constant profile result: t={end_time:.1f}s, d={end_distance:.1f}m")
        return history

    def _simulate_cycle(self) -> List[SimState]:
        """Optimized run using a drive-cycle CSV."""
        env_cfg = self.cfg.env
        car_cfg = self.cfg.car
        battery_capacity = self.cfg.car.battery_capacity
        slope = env_cfg.slope
        max_time = self.cfg.sim.duration

        history: List[SimState] = []
        energy = self.state.energy
        time = 0.0
        distance = 0.0

        # initial explicit pass through cycle
        for t, speed, accel in self._cycle_data:
            if time > max_time or energy <= 0:
                break
            demand = calc_power_demand(
                speed_m_s=speed,
                slope_rad=slope,
                acceleration_m_s2=accel,
                car=car_cfg,
                env=env_cfg,
            )
            supply = calc_power_supply(
                irradiance_w_m2=env_cfg.solar_irradiance,
                speed_m_s=speed,
                acceleration_m_s2=accel,
                car=car_cfg,
            )
            net = supply - demand
            energy += net * 1.0
            distance += speed * 1.0
            time += 1.0

            state = SimState(
                time=time,
                distance=distance,
                velocity=speed,
                energy=energy,
                last_power_demand=demand,
                last_power_supply=supply,
            )
            history.append(state)

        if energy <= 0 or time >= max_time:
            return history

        delta = self._cycle_energy_delta
        if delta < 0:
            cycles_left = int(energy / (-delta))
            full_cycle_time = cycles_left * self._cycle_length
            full_cycle_distance = cycles_left * sum(s for _, s, _ in self._cycle_data)
            time += full_cycle_time
            distance += full_cycle_distance
            energy += cycles_left * delta

            if time >= max_time or energy <= 0:
                history.append(
                    SimState(
                        time=min(time, max_time),
                        distance=distance,
                        velocity=history[-1].velocity,
                        energy=max(0.0, energy),
                        last_power_demand=history[-1].last_power_demand,
                        last_power_supply=history[-1].last_power_supply,
                    )
                )
                return history
        else:
            remaining_time = max_time - time
            repeat_cycles = int(remaining_time // self._cycle_length)
            time += repeat_cycles * self._cycle_length
            distance += repeat_cycles * sum(s for _, s, _ in self._cycle_data)
            energy += repeat_cycles * delta

        # partial cycle
        for t, speed, accel in self._cycle_data:
            if time >= max_time or energy <= 0:
                break
            demand = calc_power_demand(
                speed_m_s=speed,
                slope_rad=slope,
                acceleration_m_s2=accel,
                car=car_cfg,
                env=env_cfg,
            )
            supply = calc_power_supply(
                irradiance_w_m2=env_cfg.solar_irradiance,
                speed_m_s=speed,
                acceleration_m_s2=accel,
                car=car_cfg,
            )
            net = supply - demand
            energy += net * 1.0
            distance += speed * 1.0
            time += 1.0

            state = SimState(
                time=time,
                distance=distance,
                velocity=speed,
                energy=energy,
                last_power_demand=demand,
                last_power_supply=supply,
            )
            history.append(state)

        if history and history[-1].energy <= 0:
            history.pop()

        return history

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