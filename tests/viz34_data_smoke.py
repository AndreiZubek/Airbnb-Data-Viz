import csv
from collections import defaultdict


def load_prices(path: str = "AB_NYC_2019_clean_5000.csv") -> list[dict[str, str]]:
    with open(path, newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def test_bar_chart_and_map_data_shapes() -> None:
    rows = load_prices()

    neighborhood_groups: defaultdict[tuple[str, str], list[float]] = defaultdict(list)
    price_buckets = []

    for row in rows:
        borough = row["neighbourhood_group"].strip()
        neighborhood = row["neighbourhood"].strip()
        price = float(row["price"])

        if borough and neighborhood and price > 0:
          neighborhood_groups[(neighborhood, borough)].append(price)
          price_buckets.append(price)

    assert len(neighborhood_groups) >= 100
    assert len(price_buckets) == 5000
    assert max(price_buckets) > min(price_buckets)


if __name__ == "__main__":
    test_bar_chart_and_map_data_shapes()
    print("viz34_data_smoke.py: PASS")
