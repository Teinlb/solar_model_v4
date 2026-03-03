"""
Energy balance helper functions for the solar car simulation.
Stateless implementation based on the new Data Models.
"""

import math


def calc_air_drag_power(speed_m_s: float, car: object, env: object) -> float:
    """
    Calculate aerodynamic drag power (W).
    P = 0.5 * rho * Cd * A * v^3
    """
    return 0.5 * env.air_density * car.drag_coeff * car.frontal_area * (speed_m_s ** 3)


def calc_rolling_resistance_power(speed_m_s: float, car: object, env: object) -> float:
    """
    Calculate rolling resistance power (W).
    P = Crr * m * g * v
    """
    return car.rolling_res * car.mass * env.gravity * speed_m_s


def calc_slope_power(speed_m_s: float, car: object, env: object) -> float:
    """
    Calculate power (W) to climb a slope.
    P = m * g * v * sin(slope)
    """
    return car.mass * env.gravity * speed_m_s * math.sin(env.slope)


def calc_acceleration_power(speed_m_s: float, acceleration_m_s2: float, car: object) -> float:
    """
    Calculate power (W) to accelerate (Change in Kinetic Energy).
    P = m * a * v
    """
    return car.mass * acceleration_m_s2 * speed_m_s


def calc_power_demand(
    speed_m_s: float, 
    acceleration_m_s2: float,
    car: object, 
    env: object
) -> float:
    """
    Estimate total propulsion + auxiliaries power draw (W).
    Sums mechanical forces, applies efficiency, and adds auxiliary load.
    Note: Regenerative braking (negative acceleration) is handled in power supply.
    """
    
    p_air = calc_air_drag_power(speed_m_s, car, env)
    p_roll = calc_rolling_resistance_power(speed_m_s, car, env)
    p_slope = calc_slope_power(speed_m_s, car, env)
    p_accel = calc_acceleration_power(speed_m_s, acceleration_m_s2, car)

    # Mechanical power needed (only positive acceleration consumes power)
    p_mechanical_driving = p_air + p_roll + p_slope + max(0, p_accel)

    # Convert to electrical power demand accounting for motor efficiency
    p_electrical_traction = p_mechanical_driving / car.motor_efficiency

    # Add auxiliary power consumption
    total_consumption = p_electrical_traction + car.aux_power
    
    return total_consumption


def calc_solar_power(car: object, env: object) -> float:
    """
    Calculate solar power supply (W) from panels.
    P = irradiance * panel_area * panel_efficiency
    """
    return env.solar_irradiance * car.panel_area * car.panel_efficiency


def calc_regen_power(speed_m_s: float, acceleration_m_s2: float, car: object) -> float:
    """
    Calculate regenerative braking power supply (W).
    Only when acceleration is negative (braking/coasting down).
    P = |m * a * v| * regen_efficiency
    """
    if acceleration_m_s2 < 0:
        p_accel = calc_acceleration_power(speed_m_s, acceleration_m_s2, car)
        # p_accel is negative, convert to positive supply with regen efficiency
        regen_output = abs(p_accel) * car.regen_efficiency
        return regen_output
    
    return 0.0


def calc_power_supply(speed_m_s: float, acceleration_m_s2: float, car: object, env: object) -> float:
    """
    Calculate total power supply (W): solar panels + regenerative braking.
    Applies battery efficiency to total supply.
    """
    solar_power = calc_solar_power(car, env)
    regen_power = calc_regen_power(speed_m_s, acceleration_m_s2, car)
    
    total_power = solar_power + regen_power
    return total_power * car.battery_efficiency


def calc_net_power(speed_m_s: float, acceleration_m_s2: float, car: object, env: object) -> float:
    # power demand (W)
    power_out = calc_power_demand(
        speed_m_s=speed_m_s,
        acceleration_m_s2=acceleration_m_s2, # Simple steady-state sim
        car=car,
        env=env,
    )

    # power supply (W)
    power_in = calc_power_supply(
        speed_m_s=speed_m_s,
        acceleration_m_s2=acceleration_m_s2,  # Simple steady-state sim
        car=car,
        env=env,
    )

    # Positive net_power = Charging (Supply > Demand)
    # Negative net_power = Discharging (Demand > Supply)
    return power_in - power_out