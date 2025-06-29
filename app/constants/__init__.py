IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "svg"]
IMAGE_EXTENSIONS.extend([ext.upper() for ext in IMAGE_EXTENSIONS])

VIDEO_EXTENSIONS = ["mp4", "mov", "mpeg", "mpga"]
VIDEO_EXTENSIONS.extend([ext.upper() for ext in VIDEO_EXTENSIONS])

AUDIO_EXTENSIONS = ["mp3", "m4a", "wav", "webm", "amr"]
AUDIO_EXTENSIONS.extend([ext.upper() for ext in AUDIO_EXTENSIONS])


DOCUMENT_EXTENSIONS = [
    "txt",
    "markdown",
    "md",
    "mdx",
    "pdf",
    "html",
    "htm",
    "xlsx",
    "xls",
    "docx",
    "csv",
    "vtt",
    "properties",
]
DOCUMENT_EXTENSIONS.extend([ext.upper() for ext in DOCUMENT_EXTENSIONS])
