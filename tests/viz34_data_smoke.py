import csv
from collections import defaultdict


def build_room_type_groups(path: str = "AB_NYC_2019_clean_5000.csv") -> dict[str, list[float]]:
    groups: defaultdict[str, list[float]] = defaultdict(list)

    with open(path, newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            room_type = row["room_type"].strip()
            price = float(row["price"])

            if room_type and price > 0:
                groups[room_type].append(price)

    return dict(groups)


def build_availability_groups(path: str = "AB_NYC_2019_clean_5000.csv") -> dict[tuple[str, str], list[float]]:
    groups: defaultdict[tuple[str, str], list[float]] = defaultdict(list)

    with open(path, newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            borough = row["neighbourhood_group"].strip()
            room_type = row["room_type"].strip()
            availability = float(row["availability_365"])

            if borough and room_type:
                groups[(borough, room_type)].append(availability)

    return dict(groups)


def test_viz34_data_shapes() -> None:
    room_groups = build_room_type_groups()
    availability_groups = build_availability_groups()

    assert set(room_groups) == {"Entire home/apt", "Private room", "Shared room"}
    assert len(availability_groups) == 14
    assert ("Staten Island", "Shared room") not in availability_groups


if __name__ == "__main__":
    test_viz34_data_shapes()
    print("viz34_data_smoke.py: PASS")
