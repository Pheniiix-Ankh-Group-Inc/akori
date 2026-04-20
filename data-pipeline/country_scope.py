"""Country scope for the State of Black in Blockchain dashboard.

ISO alpha-3 codes are the authoritative keys. The overrides exist so
whatever country-name spelling Electric Capital uses can be normalized.

Edit the lists below to adjust scope.
"""

import pycountry


# African Union + observers — 54 states.
AFRICA_ISO_A3 = [
    "DZA", "AGO", "BEN", "BWA", "BFA", "BDI", "CPV", "CMR", "CAF", "TCD",
    "COM", "COD", "COG", "CIV", "DJI", "EGY", "GNQ", "ERI", "SWZ", "ETH",
    "GAB", "GMB", "GHA", "GIN", "GNB", "KEN", "LSO", "LBR", "LBY", "MDG",
    "MWI", "MLI", "MRT", "MUS", "MAR", "MOZ", "NAM", "NER", "NGA", "RWA",
    "STP", "SEN", "SYC", "SLE", "SOM", "ZAF", "SSD", "SDN", "TZA", "TGO",
    "TUN", "UGA", "ZMB", "ZWE",
]

# Caribbean: CARICOM members + French/Dutch territories + Cuba + DR + PR.
# Guyana and Suriname are mainland but CARICOM; Belize is Central American
# but CARICOM — included because culturally Caribbean.
CARIBBEAN_ISO_A3 = [
    "ATG", "BHS", "BRB", "BLZ", "CUB", "DMA", "DOM", "GRD", "GUY", "HTI",
    "JAM", "KNA", "LCA", "VCT", "SUR", "TTO",
    # territories:
    "PRI", "GLP", "MTQ", "ABW", "CUW", "MSR",
]

SCOPE_ISO_A3 = set(AFRICA_ISO_A3 + CARIBBEAN_ISO_A3)

REGION_BY_ISO = (
    {code: "Africa" for code in AFRICA_ISO_A3}
    | {code: "Caribbean" for code in CARIBBEAN_ISO_A3}
)


# Country-name variants pycountry can't reliably resolve on its own.
# Keys are the raw strings we see in the EC dataset; values are ISO a3.
NAME_OVERRIDES = {
    "Congo - Kinshasa": "COD",
    "Congo-Kinshasa": "COD",
    "Democratic Republic of Congo": "COD",
    "DR Congo": "COD",
    "Congo - Brazzaville": "COG",
    "Congo-Brazzaville": "COG",
    "Republic of the Congo": "COG",
    "Côte d’Ivoire": "CIV",
    "Côte d'Ivoire": "CIV",
    "Cote d'Ivoire": "CIV",
    "Ivory Coast": "CIV",
    "Cape Verde": "CPV",
    "Cabo Verde": "CPV",
    "Swaziland": "SWZ",
    "Eswatini": "SWZ",
    "São Tomé and Príncipe": "STP",
    "Sao Tome and Principe": "STP",
    "Curaçao": "CUW",
    "Curacao": "CUW",
    "St. Kitts & Nevis": "KNA",
    "Saint Kitts & Nevis": "KNA",
    "St. Lucia": "LCA",
    "St. Vincent & Grenadines": "VCT",
    "Saint Vincent and the Grenadines": "VCT",
    "Trinidad & Tobago": "TTO",
    "Antigua & Barbuda": "ATG",
    "Tanzania": "TZA",
    "Tanzania, United Republic of": "TZA",
}


def resolve_iso_a3(name):
    """Resolve a country-name string (in any common form) to ISO alpha-3.

    Returns None when the name can't be matched — callers should log those
    and decide whether to add to NAME_OVERRIDES.
    """
    if not name or not isinstance(name, str):
        return None
    stripped = name.strip()
    if stripped in NAME_OVERRIDES:
        return NAME_OVERRIDES[stripped]
    try:
        country = pycountry.countries.lookup(stripped)
        return country.alpha_3
    except LookupError:
        return None


def country_name(iso_a3):
    """Pretty-print a country name from its ISO a3 code."""
    try:
        return pycountry.countries.get(alpha_3=iso_a3).name
    except (AttributeError, LookupError):
        return iso_a3
