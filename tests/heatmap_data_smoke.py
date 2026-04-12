import csv
import statistics
from collections import defaultdict


def aggregate(path: str = "AB_NYC_2019_clean_5000.csv") -> dict[tuple[str, str], dict[str, float]]:
    buckets: defaultdict[tuple[str, str], list[float]] = defaultdict(list)

    with open(path, newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            borough = row["neighbourhood_group"].strip()
            room_type = row["room_type"].strip()
            price = float(row["price"])

            if borough and room_type and price > 0:
                buckets[(borough, room_type)].append(price)

    return {
        key: {
            "count": len(values),
            "average": sum(values) / len(values),
            "median": statistics.median(values),
        }
        for key, values in buckets.items()
    }


def test_heatmap_aggregation_shape() -> None:
    result = aggregate()
    boroughs = {borough for borough, _ in result}
    room_types = {room_type for _, room_type in result}

    assert boroughs == {"Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"}
    assert room_types == {"Entire home/apt", "Private room", "Shared room"}
    assert len(result) == 14
    assert ("Staten Island", "Shared room") not in result

    for stats in result.values():
        assert stats["count"] > 0
        assert stats["average"] > 0
        assert stats["median"] > 0


if __name__ == "__main__":
    test_heatmap_aggregation_shape()
    print("heatmap_data_smoke.py: PASS")
