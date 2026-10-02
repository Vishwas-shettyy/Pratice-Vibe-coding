import json
with open("backend/data/kodagu_osm_roads_raw.json", "r") as f:
    data = json.load(f)

elements = data.get("elements", [])
ways = [e for e in elements if e.get("type") == "way"]

print(f"Total roads (ways): {len(ways)}")
with_names = sum(1 for w in ways if "name" in w.get("tags", {}))
print(f"With names: {with_names}")
print(f"Without names: {len(ways) - with_names}")
with_geom = sum(1 for w in ways if "geometry" in w and len(w["geometry"]) > 1)
print(f"With geometry: {with_geom}")
with_surface = sum(1 for w in ways if "surface" in w.get("tags", {}))
print(f"With surface: {with_surface}")
with_bridge = sum(1 for w in ways if "bridge" in w.get("tags", {}))
print(f"With bridge: {with_bridge}")
with_oneway = sum(1 for w in ways if "oneway" in w.get("tags", {}))
print(f"With oneway: {with_oneway}")
with_access = sum(1 for w in ways if "access" in w.get("tags", {}))
print(f"With access: {with_access}")
with_maxspeed = sum(1 for w in ways if "maxspeed" in w.get("tags", {}))
print(f"With maxspeed: {with_maxspeed}")

highway_classes = {}
for w in ways:
    hw = w.get("tags", {}).get("highway")
    highway_classes[hw] = highway_classes.get(hw, 0) + 1
print(f"Highway classes: {highway_classes}")

print("\nSample of 5 records:")
for w in ways[:5]:
    tags = w.get("tags", {})
    geom_len = len(w.get("geometry", []))
    id = w.get("id")
    name = tags.get("name")
    hw_class = tags.get("highway")
    surface = tags.get("surface")
    bridge = tags.get("bridge")
    oneway = tags.get("oneway")
    access = tags.get("access")
    maxspeed = tags.get("maxspeed")
    print(f"Way ID: {id}, Name: {name}, Class: {hw_class}, Geom Points: {geom_len}, Surface: {surface}, Bridge: {bridge}, Oneway: {oneway}, Access: {access}, Maxspeed: {maxspeed}")
