from typing import Any, Type

from autotrain.backends.base import AVAILABLE_HARDWARE


def common_args():
    return [
        {
            "arg": "--train",
            "help": "Run training",
            "required": False,
            "action": "store_true",
        },
        {
            "arg": "--backend",
            "help": "Backend to use",
            "required": False,
            "type": str,
            "default": "local",
            "choices": list(AVAILABLE_HARDWARE.keys()),
        },
        {
            "arg": "--username",
            "help": "Hugging Face Hub username (optional)",
            "required": False,
            "type": str,
        },
        {
            "arg": "--token",
            "help": "Hugging Face Hub token (optional)",
            "required": False,
            "type": str,
        },
    ]


def python_type_from_schema_field(field_data: dict) -> Type:
    type_map = {
        "string": str,
        "number": float,
        "integer": int,
        "boolean": bool,
    }
    field_type = field_data.get("type")
    if field_type:
        return type_map.get(field_type, str)
    elif "anyOf" in field_data:
        for type_option in field_data["anyOf"]:
            if type_option.get("type") != "null":
                return type_map.get(type_option.get("type"), str)
    return str


def get_default_value(field_data: dict) -> Any:
    return field_data.get("default")


def get_field_info(params_class):
    schema = params_class.model_json_schema()
    properties = schema.get("properties", {})
    field_info = []
    for field_name, field_data in properties.items():
        temp_info = {
            "arg": f"--{field_name.replace('_', '-')}",
            "alias": [f"--{field_name}", f"--{field_name.replace('_', '-')}", f"--{field_name.replace('_', '_')}"],
            "type": python_type_from_schema_field(field_data),
            "help": field_data.get("title", ""),
            "default": get_default_value(field_data),
        }
        if temp_info["type"] == bool:
            temp_info["action"] = "store_true"
        field_info.append(temp_info)
    return field_info
