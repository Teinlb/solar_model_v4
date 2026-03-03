from dataclasses import dataclass

@dataclass(slots=True)
class SimState:
    time: float = 0.0
    distance: float = 0.0
    velocity: float = 0.0
    acceleration: float = 0.0
    energy: float = 0.0
    power: float = 0.0