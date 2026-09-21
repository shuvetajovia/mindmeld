import json
import logging
import networkx as nx
from sqlalchemy.orm import Session
from backend.app.db.session import IS_POSTGRES
from backend.app.models.spatial import RoadSegment, SensorNode
from backend.app.models.report import FieldCrowdsourceReport
from backend.app.schemas.routing import SafeRouteResponse, DetourStep

logger = logging.getLogger(__name__)

# List of pre-defined NER highway coordinate interpolations for beautiful GIS rendering.
# These will be seeded if the database is empty.
NER_SEEDS = [
    # NH-10
    {
        "name": "NH-10",
        "section": "Siliguri - Gangtok",
        "length_km": 114.0,
        "slope": 12.5, "elevation": 1400.0, "aspect_sin": 0.35, "aspect_cos": 0.90, "curvature": 0.02, "dist_to_road_km": 0.05,
        "source": "Siliguri", "target": "Gangtok",
        "coords": [[26.7271, 88.3953], [26.8500, 88.4200], [27.0500, 88.4500], [27.2000, 88.5000], [27.3314, 88.6138]]
    },
    {
        "name": "NH-10",
        "section": "Gangtok - Mangan",
        "length_km": 52.0,
        "slope": 18.2, "elevation": 1700.0, "aspect_sin": -0.42, "aspect_cos": 0.88, "curvature": 0.03, "dist_to_road_km": 0.02,
        "source": "Gangtok", "target": "Mangan",
        "coords": [[27.3314, 88.6138], [27.4200, 88.6000], [27.5000, 88.5800], [27.5256, 88.5283]]
    },
    # NH-27 (East-West Corridor through Assam)
    {
        "name": "NH-27",
        "section": "Siliguri - Guwahati",
        "length_km": 470.0,
        "slope": 1.2, "elevation": 100.0, "aspect_sin": 0.1, "aspect_cos": 0.98, "curvature": 0.001, "dist_to_road_km": 0.1,
        "source": "Siliguri", "target": "Guwahati",
        "coords": [[26.7271, 88.3953], [26.5000, 89.5000], [26.3000, 90.5000], [26.1445, 91.7362]]
    },
    {
        "name": "NH-27",
        "section": "Guwahati - Tezpur",
        "length_km": 180.0,
        "slope": 2.1, "elevation": 120.0, "aspect_sin": 0.2, "aspect_cos": 0.95, "curvature": 0.005, "dist_to_road_km": 0.08,
        "source": "Guwahati", "target": "Tezpur",
        "coords": [[26.1445, 91.7362], [26.3000, 92.2000], [26.4500, 92.5000], [26.6528, 92.7926]]
    },
    {
        "name": "NH-27",
        "section": "Tezpur - Jorhat",
        "length_km": 150.0,
        "slope": 1.5, "elevation": 110.0, "aspect_sin": -0.15, "aspect_cos": 0.97, "curvature": 0.002, "dist_to_road_km": 0.07,
        "source": "Tezpur", "target": "Jorhat",
        "coords": [[26.6528, 92.7926], [26.7500, 93.5000], [26.7509, 94.2037]]
    },
    {
        "name": "NH-27",
        "section": "Jorhat - Dibrugarh",
        "length_km": 138.0,
        "slope": 0.8, "elevation": 100.0, "aspect_sin": 0.05, "aspect_cos": 0.99, "curvature": 0.001, "dist_to_road_km": 0.09,
        "source": "Jorhat", "target": "Dibrugarh",
        "coords": [[26.7509, 94.2037], [27.0000, 94.5000], [27.4728, 94.9120]]
    },
    # NH-29
    {
        "name": "NH-29",
        "section": "Guwahati - Dimapur",
        "length_km": 280.0,
        "slope": 4.5, "elevation": 200.0, "aspect_sin": 0.3, "aspect_cos": 0.90, "curvature": 0.008, "dist_to_road_km": 0.06,
        "source": "Guwahati", "target": "Dimapur",
        "coords": [[26.1445, 91.7362], [26.0000, 92.5000], [25.9061, 93.7264]]
    },
    {
        "name": "NH-29",
        "section": "Dimapur - Kohima",
        "length_km": 74.0,
        "slope": 14.8, "elevation": 1444.0, "aspect_sin": 0.52, "aspect_cos": 0.75, "curvature": 0.025, "dist_to_road_km": 0.03,
        "source": "Dimapur", "target": "Kohima",
        "coords": [[25.9061, 93.7264], [25.8000, 93.9000], [25.6751, 94.1086]]
    },
    {
        "name": "NH-29",
        "section": "Kohima - Imphal",
        "length_km": 138.0,
        "slope": 16.5, "elevation": 1500.0, "aspect_sin": -0.60, "aspect_cos": 0.65, "curvature": 0.028, "dist_to_road_km": 0.04,
        "source": "Kohima", "target": "Imphal",
        "coords": [[25.6751, 94.1086], [25.2000, 94.0000], [24.8170, 93.9368]]
    },
    # NH-44 & state links connecting Shillong, Agartala, Aizawl
    {
        "name": "NH-44",
        "section": "Guwahati - Shillong",
        "length_km": 100.0,
        "slope": 8.5, "elevation": 1500.0, "aspect_sin": 0.40, "aspect_cos": 0.85, "curvature": 0.015, "dist_to_road_km": 0.05,
        "source": "Guwahati", "target": "Shillong",
        "coords": [[26.1445, 91.7362], [25.9000, 91.8500], [25.5788, 91.8931]]
    },
    {
        "name": "NH-44",
        "section": "Shillong - Agartala",
        "length_km": 450.0,
        "slope": 10.2, "elevation": 800.0, "aspect_sin": 0.25, "aspect_cos": 0.90, "curvature": 0.018, "dist_to_road_km": 0.03,
        "source": "Shillong", "target": "Agartala",
        "coords": [[25.5788, 91.8931], [25.0000, 92.2000], [24.3000, 92.0000], [23.8315, 91.2868]]
    },
    {
        "name": "NH-44",
        "section": "Shillong - Aizawl",
        "length_km": 350.0,
        "slope": 12.0, "elevation": 1200.0, "aspect_sin": -0.30, "aspect_cos": 0.88, "curvature": 0.022, "dist_to_road_km": 0.04,
        "source": "Shillong", "target": "Aizawl",
        "coords": [[25.5788, 91.8931], [25.0000, 92.5000], [24.5000, 92.8000], [23.7307, 92.7173]]
    }
]

def seed_road_networks(db: Session):
    """
    Seeds primary highway network corridors into the database if empty.
    """
    count = db.query(RoadSegment).count()
    if count > 0:
        return

    logger.info("Seeding Road Corridor network database...")
    for seed in NER_SEEDS:
        geom_val = None
        if IS_POSTGRES:
            # Construct PostGIS LineString geometry WKT
            wkt_pts = ", ".join([f"{lon} {lat}" for lat, lon in seed["coords"]])
            geom_val = f"SRID=4326;LINESTRING({wkt_pts})"
        else:
            # SQLite stores JSON array of coords
            geom_val = json.dumps(seed["coords"])

        segment = RoadSegment(
            name=seed["name"],
            section=seed["section"],
            geometry=geom_val,
            length_km=seed["length_km"],
            slope=seed["slope"],
            elevation=seed["elevation"],
            aspect_sin=seed["aspect_sin"],
            aspect_cos=seed["aspect_cos"],
            curvature=seed["curvature"],
            dist_to_road_km=seed["dist_to_road_km"],
            risk_probability=0.05,
            risk_score=1.0,
            status="OPEN"
        )
        db.add(segment)
    
    # Also seed some sensor nodes at key locations
    sensor_seeds = [
        {"id": "NODE_NH10_MANGAN", "name": "Mangan Weather IoT Station", "lat": 27.5256, "lon": 88.5283},
        {"id": "NODE_NH10_GANGTOK", "name": "Gangtok Soil Moisture Grid", "lat": 27.3314, "lon": 88.6138},
        {"id": "NODE_NH29_KOHIMA", "name": "Kohima Disaster Sensor", "lat": 25.6751, "lon": 94.1086},
        {"id": "NODE_NH29_DIMAPUR", "name": "Dimapur Gateway Station", "lat": 25.9061, "lon": 93.7264},
        {"id": "NODE_NH44_SHILLONG", "name": "Shillong Hills Sensor Array", "lat": 25.5788, "lon": 91.8931}
    ]
    for s_seed in sensor_seeds:
        node = SensorNode(
            id=s_seed["id"],
            name=s_seed["name"],
            latitude=s_seed["lat"],
            longitude=s_seed["lon"],
            soil_moisture=25.0,
            rain_24h_obs=0.0,
            rain_48h_prior=0.0,
            rain_72h_prior=0.0,
            rain_7d_prior=0.0,
            api_7d=0.0,
            r24_seasonal_anom=0.0,
            api_seasonal_anom=0.0
        )
        db.add(node)
        
    db.commit()
    logger.info("Successfully seeded road corridors and IoT nodes.")

def get_segment_coords(segment: RoadSegment) -> list:
    """
    Deserializes the geometry column into a list of [lat, lon] coordinates.
    """
    if IS_POSTGRES:
        # Convert PostGIS geometry object to shapely geometry
        from geoalchemy2.shape import to_shape
        try:
            shape = to_shape(segment.geometry)
            # GeoAlchemy/Shapely coordinates are [lon, lat], Leaflet expects [lat, lon]
            return [[float(p[1]), float(p[0])] for p in shape.coords]
        except Exception as e:
            logger.error(f"Error parsing Postgres geometry: {str(e)}")
            return []
    else:
        # SQLite stores coordinates as JSON string
        try:
            return json.loads(segment.geometry)
        except Exception as e:
            logger.error(f"Error parsing SQLite geometry: {str(e)}")
            return []

class RoutingEngine:
    def build_network_graph(self, db: Session, alpha: float) -> nx.MultiDiGraph:
        """
        Builds the road network graph from the database.
        Each edge contains dynamic weights based on length and risk scores.
        """
        # Ensure database is seeded
        seed_road_networks(db)

        G = nx.MultiDiGraph()
        segments = db.query(RoadSegment).all()

        # Check if there are active verified road blockages from citizens
        # We flag any segments that contain verified crowdsourced reports within a 5km radius
        # For simplicity, we search for verified reports and match by coordinates or section.
        blocked_sections = set()
        reports = db.query(FieldCrowdsourceReport).filter(
            FieldCrowdsourceReport.verified == True,
            FieldCrowdsourceReport.severity.in_(["HIGH", "CRITICAL"])
        ).all()
        
        for r in reports:
            # Find closest segment (simple proximity check or description matching)
            for seg in segments:
                coords = get_segment_coords(seg)
                if coords:
                    # Check distance from report lat/lon to start/end of segment
                    dist_to_start = ((r.latitude - coords[0][0])**2 + (r.longitude - coords[0][1])**2)**0.5
                    dist_to_end = ((r.latitude - coords[-1][0])**2 + (r.longitude - coords[-1][1])**2)**0.5
                    # 5km in degree coords is approx 0.045 degrees
                    if dist_to_start < 0.045 or dist_to_end < 0.045:
                        blocked_sections.add(seg.id)
                        logger.warning(f"Road Segment {seg.name} ({seg.section}) is BLOCKED by citizen report ID {r.id}")

        for seg in segments:
            # Parse nodes from database structure
            # To ensure the graph connects properly, we look up source and target from seed configurations matching sections
            source_node = None
            target_node = None
            for seed in NER_SEEDS:
                if seed["name"] == seg.name and seed["section"] == seg.section:
                    source_node = seed["source"]
                    target_node = seed["target"]
                    break

            if not source_node or not target_node:
                # Fallback parsed from section
                parts = seg.section.split(" - ")
                source_node = parts[0].strip()
                target_node = parts[1].strip() if len(parts) > 1 else "Unknown"

            # Check impassable flags: Risk >= 7 or Probability >= 0.65 or citizen blocked
            is_blocked = (
                seg.status == "BLOCKED" or 
                seg.risk_score >= 7.0 or 
                seg.risk_probability >= 0.65 or 
                seg.id in blocked_sections
            )

            # Hazard-aware cost formulation
            # Cost = Length * (1.0 + alpha * (Risk Index ^ 2))
            cost = seg.length_km * (1.0 + alpha * (seg.risk_score ** 2))

            # Add bidirectional edge representation for highways
            coords = get_segment_coords(seg)
            
            # Forward Edge
            G.add_edge(
                source_node,
                target_node,
                id=seg.id,
                name=seg.name,
                section=seg.section,
                length=seg.length_km,
                risk=seg.risk_score,
                cost=cost,
                status="BLOCKED" if is_blocked else seg.status,
                coords=coords,
                key="forward"
            )

            # Reverse Edge (bidirectional highway)
            G.add_edge(
                target_node,
                source_node,
                id=seg.id,
                name=seg.name,
                section=seg.section,
                length=seg.length_km,
                risk=seg.risk_score,
                cost=cost,
                status="BLOCKED" if is_blocked else seg.status,
                coords=coords[::-1], # Reversed geometry for backward transit
                key="backward"
            )

        return G

    def find_safe_route(self, db: Session, origin: str, destination: str, alpha: float = 0.5) -> SafeRouteResponse:
        """
        Solves Dijkstra's algorithm over the road network graph.
        If blocked segments exist, it routes around them.
        """
        G = self.build_network_graph(db, alpha)

        if origin not in G or destination not in G:
            raise ValueError(f"Origin '{origin}' or Destination '{destination}' not found in the NER corridor network.")

        # Create a filtered subgraph excluding IMPASSABLE/BLOCKED edges
        # We try to route strictly through non-blocked edges first.
        def edge_filter(u, v, k):
            edge_data = G.edges[u, v, k]
            return edge_data["status"] != "BLOCKED"

        sub_G = nx.subgraph_view(G, filter_edge=edge_filter)

        path_nodes = None
        used_blocked = False

        try:
            # Run Dijkstra on the safe filtered graph
            path_nodes = nx.shortest_path(sub_G, source=origin, target=destination, weight="cost")
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            # Fallback: If no fully clear path exists, run routing on the full graph with massive cost penalties for blocked links
            logger.warning("No fully clear route found! Falling back to full graph with cost penalty for blocked links.")
            
            # Create a copy of G and add high penalty to blocked edges
            penalty_G = G.copy()
            for u, v, k in penalty_G.edges(keys=True):
                if penalty_G.edges[u, v, k]["status"] == "BLOCKED":
                    penalty_G.edges[u, v, k]["cost"] += 1000000.0  # 1 Million cost penalty
            
            try:
                path_nodes = nx.shortest_path(penalty_G, source=origin, target=destination, weight="cost")
                used_blocked = True
            except nx.NetworkXNoPath:
                raise ValueError("No routing path possible, even considering emergency blocked access routes.")

        # Reconstruct path detail, coordinate waypoints, and step-by-step detours
        waypoints = []
        detour_steps = []
        total_distance = 0.0
        total_risk = 0.0
        edge_count = 0
        overall_status = "OPEN"

        # Start coordinates at origin node
        for i in range(len(path_nodes) - 1):
            u = path_nodes[i]
            v = path_nodes[i+1]
            
            # Find the best edge key between u and v
            best_key = min(G[u][v].keys(), key=lambda k: G[u][v][k]["cost"])
            edge_data = G[u][v][best_key]

            # Add waypoints
            seg_coords = edge_data["coords"]
            if i == 0:
                waypoints.extend(seg_coords)
            else:
                # Avoid duplicating node intersection coordinate
                waypoints.extend(seg_coords[1:])

            # Compile step-by-step detour
            distance = edge_data["length"]
            risk = edge_data["risk"]
            speed = 45.0 if risk < 4.0 else (30.0 if risk < 7.0 else 15.0)  # Reduced speed for caution/blocked segments
            transit_time = (distance / speed) * 60.0 # minutes

            step_status = edge_data["status"]
            if step_status == "BLOCKED":
                overall_status = "BLOCKED"
                instruction = f"EMERGENCY WARNING: Proceed with extreme caution on {edge_data['name']} ({edge_data['section']}). Landslide hazard blocked corridor!"
            elif step_status == "CAUTION" or risk >= 4.0:
                if overall_status != "BLOCKED":
                    overall_status = "CAUTION"
                instruction = f"CAUTION: Road segment {edge_data['name']} ({edge_data['section']}) has elevated hazard warning (Risk: {risk:.1f}/10). Drive slowly."
            else:
                instruction = f"Proceed on {edge_data['name']} from {u} to {v} ({edge_data['section']}) - road clear."

            detour_steps.append(
                DetourStep(
                    instruction=instruction,
                    distance_km=round(distance, 1),
                    estimated_time_mins=round(transit_time, 1),
                    risk_score=round(risk, 1),
                    segment_name=f"{edge_data['name']} - {edge_data['section']}"
                )
            )

            total_distance += distance
            total_risk += risk
            edge_count += 1

        avg_risk = total_risk / edge_count if edge_count > 0 else 1.0

        return SafeRouteResponse(
            origin=origin,
            destination=destination,
            total_distance_km=round(total_distance, 1),
            average_risk=round(avg_risk, 1),
            status=overall_status,
            waypoints=waypoints,
            detour_steps=detour_steps,
            alternative_available=used_blocked
        )

# Global RoutingEngine singleton
routing_engine = RoutingEngine()
