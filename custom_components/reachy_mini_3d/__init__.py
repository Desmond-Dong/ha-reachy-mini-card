"""Reachy Mini 3D Card Integration for Home Assistant."""
from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.http import StaticPathConfig
from homeassistant.components.frontend import async_register_built_in_panel
from homeassistant.components.lovelace import _register_panel
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

DOMAIN = "reachy_mini_3d"
STATIC_PATH = "/reachy_mini_3d_static"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the Reachy Mini 3D component."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Reachy Mini 3D from a config entry."""
    
    # Get the path to our static files
    component_path = Path(__file__).parent
    www_path = component_path / "www"
    
    # Register static paths for serving JS, STL, URDF files
    await hass.http.async_register_static_paths([
        StaticPathConfig(STATIC_PATH, str(www_path), True)
    ])
    
    _LOGGER.info("Registered static path: %s -> %s", STATIC_PATH, www_path)
    
    # Register the Lovelace resource using frontend
    js_url = f"{STATIC_PATH}/ha-reachy-mini-card.js"
    
    # Add resource to lovelace
    await _add_lovelace_resource(hass, js_url)
    
    return True


async def _add_lovelace_resource(hass: HomeAssistant, url: str) -> None:
    """Add a Lovelace resource."""
    try:
        # Method 1: Try using lovelace resources collection
        if "lovelace" in hass.data and "resources" in hass.data["lovelace"]:
            resources = hass.data["lovelace"]["resources"]
            
            # Check if already registered
            for item in resources.async_items():
                if item.get("url") == url:
                    _LOGGER.debug("Lovelace resource already registered: %s", url)
                    return
            
            # Add new resource
            await resources.async_create_item({
                "url": url,
                "type": "module"
            })
            _LOGGER.info("Registered Lovelace resource: %s", url)
            return
    except Exception as err:
        _LOGGER.debug("Could not use lovelace resources: %s", err)
    
    # Method 2: Use hass.components.frontend
    try:
        from homeassistant.components.frontend import add_extra_js_url
        add_extra_js_url(hass, url)
        _LOGGER.info("Added extra JS URL: %s", url)
    except Exception as err:
        _LOGGER.warning(
            "Could not auto-register Lovelace resource. "
            "Please add manually in Settings -> Dashboards -> Resources: %s", 
            url
        )


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    return True
