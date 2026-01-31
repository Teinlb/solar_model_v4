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


def calc_slope_power(speed_m_s: float, slope_rad: float, car: object, env: object) -> float:
    """
    Calculate power (W) to climb a slope.
    P = m * g * v * sin(slope)
    """
    return car.mass * env.gravity * speed_m_s * math.sin(slope_rad)


def calc_acceleration_power(speed_m_s: float, acceleration_m_s2: float, car: object) -> float:
    """
    Calculate power (W) to accelerate (Change in Kinetic Energy).
    P = m * a * v
    """
    return car.mass * acceleration_m_s2 * speed_m_s


def calc_power_demand(
    speed_m_s: float, 
    slope_rad: float, 
    acceleration_m_s2: float,
    car: object, 
    env: object
) -> float:
    """
    Estimate total propulsion + auxiliaries power draw (W).
    Sums mechanical forces, applies efficiency, and adds auxiliary load.
    """
    
    p_air = calc_air_drag_power(speed_m_s, car, env)
    p_roll = calc_rolling_resistance_power(speed_m_s, car, env)
    p_slope = calc_slope_power(speed_m_s, slope_rad, car, env)
    p_accel = calc_acceleration_power(speed_m_s, acceleration_m_s2, car)

    p_mechanical_total = p_air + p_roll + p_slope + p_accel

    # Convert to electrical power demand accounting for motor efficiency
    if p_mechanical_total > 0:
        p_electrical_traction = p_mechanical_total / car.motor_efficiency
    else:
        # Regenerative braking
        p_electrical_traction = p_mechanical_total * car.regen_efficiency

    # Add auxiliary power consumption
    total_consumption = p_electrical_traction + car.aux_power
    
    return total_consumption


def calc_power_supply(irradiance_w_m2: float, car: object) -> float:
    """
    Solar power supply (W) from panels.
    """
    return irradiance_w_m2 * car.panel_area * car.panel_efficiency