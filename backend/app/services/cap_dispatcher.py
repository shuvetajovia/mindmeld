import xml.etree.ElementTree as ET
from datetime import datetime
from backend.app.schemas.alert import CAPAlert, CAPInfo, CAPArea

def format_datetime(dt: datetime) -> str:
    """Formats datetime to ISO 8601 offset format (e.g. 2026-08-23T22:20:00+05:30)"""
    return dt.isoformat() + "+05:30"

def generate_cap_json(alert: CAPAlert) -> dict:
    """Converts a Pydantic CAPAlert into standard CAP JSON structure"""
    return alert.model_dump()

def generate_cap_xml(alert: CAPAlert) -> str:
    """
    Serializes a CAPAlert Pydantic model into an OASIS CAP v1.2 compliant XML string.
    """
    root = ET.Element("alert", xmlns="urn:oasis:names:tc:emergency:cap:1.2")
    
    ET.SubElement(root, "identifier").text = alert.identifier
    ET.SubElement(root, "sender").text = alert.sender
    ET.SubElement(root, "sent").text = alert.sent
    ET.SubElement(root, "status").text = alert.status
    ET.SubElement(root, "msgType").text = alert.msgType
    ET.SubElement(root, "scope").text = alert.scope
    
    for info_schema in alert.info:
        info_node = ET.SubElement(root, "info")
        ET.SubElement(info_node, "category").text = info_schema.category
        ET.SubElement(info_node, "event").text = info_schema.event
        ET.SubElement(info_node, "urgency").text = info_schema.urgency
        ET.SubElement(info_node, "severity").text = info_schema.severity
        ET.SubElement(info_node, "certainty").text = info_schema.certainty
        ET.SubElement(info_node, "headline").text = info_schema.headline
        ET.SubElement(info_node, "description").text = info_schema.description
        if info_schema.instruction:
            ET.SubElement(info_node, "instruction").text = info_schema.instruction
        ET.SubElement(info_node, "senderName").text = info_schema.senderName
        
        for area_schema in info_schema.area:
            area_node = ET.SubElement(info_node, "area")
            ET.SubElement(area_node, "areaDesc").text = area_schema.areaDesc
            if area_schema.polygon:
                ET.SubElement(area_node, "polygon").text = area_schema.polygon
            if area_schema.circle:
                ET.SubElement(area_node, "circle").text = area_schema.circle
                
    # Generate XML string declaration
    xml_str = ET.tostring(root, encoding="utf-8", method="xml")
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + xml_str.decode("utf-8")
