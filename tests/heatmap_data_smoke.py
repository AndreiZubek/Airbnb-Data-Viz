import csv
from collections import defaultdict


def load_rows(path: str = "AB_NYC_2019_clean_5000.csv") -> list[dict[str, str]]:
    with open(path, newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def test_dataset_shapes() -> None:
    rows = load_rows()
    assert len(rows) == 5000

    boroughs = {row["neighbourhood_group"].strip() for row in rows if row["neighbourhood_group"].strip()}
    room_types = {row["room_type"].strip() for row in rows if row["room_type"].strip()}
    neighborhoods = {row["neighbourhood"].strip() for row in rows if row["neighbourhood"].strip()}

    assert boroughs == {"Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"}
    assert room_types == {"Entire home/apt", "Private room", "Shared room"}
    assert len(neighborhoods) >= 100


def test_borough_room_heatmap_shape() -> None:
    groups: defaultdict[tuple[str, str], list[float]] = defaultdict(list)

    for row in load_rows():
      borough = row["neighbourhood_group"].strip()
      room_type = row["room_type"].strip()
      price = float(row["price"])

      if borough and room_type and price > 0:
          groups[(borough, room_type)].append(price)

    assert len(groups) == 14
    assert ("Staten Island", "Shared room") not in groups


def test_price_review_relationship_is_weak() -> None:
    rows = load_rows()
    prices = [float(row["price"]) for row in rows if float(row["price"]) > 0]
    reviews = [float(row["number_of_reviews"]) for row in rows if float(row["price"]) > 0]

    mean_price = sum(prices) / len(prices)
    mean_reviews = sum(reviews) / len(reviews)

    numerator = sum((x - mean_reviews) * (y - mean_price) for x, y in zip(reviews, prices))
    denominator = (
        sum((x - mean_reviews) ** 2 for x in reviews) * sum((y - mean_price) ** 2 for y in prices)
    ) ** 0.5

    correlation = numerator / denominator
    assert correlation < 0


if __name__ == "__main__":
    test_dataset_shapes()
    test_borough_room_heatmap_shape()
    test_price_review_relationship_is_weak()
    print("heatmap_data_smoke.py: PASS")
