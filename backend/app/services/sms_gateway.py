import logging

logger = logging.getLogger(__name__)

# Translated landslide early warning messages
MESSAGES = {
    "English": "EMERGENCY WARNING: High landslide hazard warning for highway corridor {segment}. Risk score: {risk}/10. Avoid transit and check safe detour routes.",
    "Assamese": "জৰুৰীকালীন সতৰ্কতা: {segment} ঘাইপথত ভূমিস্খলনৰ তীব্ৰ আশংকা। বিপদ সূচক: {risk}/10। অনুগ্ৰহ কৰি যাত্ৰা কৰাৰ পৰা বিৰত থাকক আৰু বিকল্প পথ ব্যৱহাৰ কৰক।",
    "Bengali": "জরুরী সতর্কতা: {segment} জাতীয় সড়কে ধসের প্রবল সম্ভাবনা। ঝুঁকি সূচক: {risk}/10। ভ্রমণ এড়িয়ে চলুন এবং বিকল্প নিরাপদ রুট অনুসন্ধান করুন।",
    "Mizo": "HMALAKNA HMANMAWH SATARKNA: {segment} kawngah leilung tlahniam thut thei dinhmun a sang hle. Risk level: {risk}/10. Zin chhuah pumping thulh la, kawng dang him zawk zawng rawh."
}

def dispatch_sms_warnings(segment_name: str, risk_score: int, language: str = "English", recipients: list = None) -> dict:
    """
    Simulates sending SMS alerts via a bulk sms gateway API.
    Log outputs and returns the broadcast results.
    """
    if recipients is None:
        recipients = ["+919876543210", "+919435012345"] # Mock local numbers

    template = MESSAGES.get(language, MESSAGES["English"])
    formatted_msg = template.format(segment=segment_name, risk=risk_score)

    logger.info(f"Dispatched SMS Warning in {language} to {len(recipients)} recipients...")
    logger.info(f"Message content: '{formatted_msg}'")

    # In a real environment, you would use requests.post to a gateway (like NIC SMS / Twilio / MSG91)
    dispatch_logs = []
    for ph in recipients:
        dispatch_logs.append({
            "recipient": ph,
            "status": "SENT",
            "message": formatted_msg,
            "provider_response_id": f"sms_msg_{ph[-5:]}_ack"
        })

    return {
        "success": True,
        "language": language,
        "recipients_count": len(recipients),
        "message": formatted_msg,
        "logs": dispatch_logs
    }
