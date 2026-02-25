// Reduced country data for better performance
// Only includes the most common countries instead of the full 776KB dataset

export interface Country {
    countryName: string;
    countryShortCode: string;
    regions: Region[];
}

export interface Region {
    name: string;
    shortCode: string;
}

// Top countries by population/economy - can be customized based on your target markets
export const reducedCountryData: Country[] = [
    {
        countryName: "United Kingdom",
        countryShortCode: "GB",
        regions: [
            { name: "England", shortCode: "ENG" },
            { name: "Scotland", shortCode: "SCT" },
            { name: "Wales", shortCode: "WLS" },
            { name: "Northern Ireland", shortCode: "NIR" }
        ]
    },
    {
        countryName: "United States",
        countryShortCode: "US",
        regions: [
            { name: "Alabama", shortCode: "AL" },
            { name: "Alaska", shortCode: "AK" },
            { name: "Arizona", shortCode: "AZ" },
            { name: "Arkansas", shortCode: "AR" },
            { name: "California", shortCode: "CA" },
            { name: "Colorado", shortCode: "CO" },
            { name: "Connecticut", shortCode: "CT" },
            { name: "Delaware", shortCode: "DE" },
            { name: "Florida", shortCode: "FL" },
            { name: "Georgia", shortCode: "GA" },
            { name: "Hawaii", shortCode: "HI" },
            { name: "Idaho", shortCode: "ID" },
            { name: "Illinois", shortCode: "IL" },
            { name: "Indiana", shortCode: "IN" },
            { name: "Iowa", shortCode: "IA" },
            { name: "Kansas", shortCode: "KS" },
            { name: "Kentucky", shortCode: "KY" },
            { name: "Louisiana", shortCode: "LA" },
            { name: "Maine", shortCode: "ME" },
            { name: "Maryland", shortCode: "MD" },
            { name: "Massachusetts", shortCode: "MA" },
            { name: "Michigan", shortCode: "MI" },
            { name: "Minnesota", shortCode: "MN" },
            { name: "Mississippi", shortCode: "MS" },
            { name: "Missouri", shortCode: "MO" },
            { name: "Montana", shortCode: "MT" },
            { name: "Nebraska", shortCode: "NE" },
            { name: "Nevada", shortCode: "NV" },
            { name: "New Hampshire", shortCode: "NH" },
            { name: "New Jersey", shortCode: "NJ" },
            { name: "New Mexico", shortCode: "NM" },
            { name: "New York", shortCode: "NY" },
            { name: "North Carolina", shortCode: "NC" },
            { name: "North Dakota", shortCode: "ND" },
            { name: "Ohio", shortCode: "OH" },
            { name: "Oklahoma", shortCode: "OK" },
            { name: "Oregon", shortCode: "OR" },
            { name: "Pennsylvania", shortCode: "PA" },
            { name: "Rhode Island", shortCode: "RI" },
            { name: "South Carolina", shortCode: "SC" },
            { name: "South Dakota", shortCode: "SD" },
            { name: "Tennessee", shortCode: "TN" },
            { name: "Texas", shortCode: "TX" },
            { name: "Utah", shortCode: "UT" },
            { name: "Vermont", shortCode: "VT" },
            { name: "Virginia", shortCode: "VA" },
            { name: "Washington", shortCode: "WA" },
            { name: "West Virginia", shortCode: "WV" },
            { name: "Wisconsin", shortCode: "WI" },
            { name: "Wyoming", shortCode: "WY" }
        ]
    },
    {
        countryName: "Germany",
        countryShortCode: "DE",
        regions: [
            { name: "Baden-Württemberg", shortCode: "BW" },
            { name: "Bavaria", shortCode: "BY" },
            { name: "Berlin", shortCode: "BE" },
            { name: "Brandenburg", shortCode: "BB" },
            { name: "Bremen", shortCode: "HB" },
            { name: "Hamburg", shortCode: "HH" },
            { name: "Hesse", shortCode: "HE" },
            { name: "Lower Saxony", shortCode: "NI" },
            { name: "Mecklenburg-Vorpommern", shortCode: "MV" },
            { name: "North Rhine-Westphalia", shortCode: "NW" },
            { name: "Rhineland-Palatinate", shortCode: "RP" },
            { name: "Saarland", shortCode: "SL" },
            { name: "Saxony", shortCode: "SN" },
            { name: "Saxony-Anhalt", shortCode: "ST" },
            { name: "Schleswig-Holstein", shortCode: "SH" },
            { name: "Thuringia", shortCode: "TH" }
        ]
    },
    {
        countryName: "Canada",
        countryShortCode: "CA",
        regions: [
            { name: "Alberta", shortCode: "AB" },
            { name: "British Columbia", shortCode: "BC" },
            { name: "Manitoba", shortCode: "MB" },
            { name: "New Brunswick", shortCode: "NB" },
            { name: "Newfoundland and Labrador", shortCode: "NL" },
            { name: "Nova Scotia", shortCode: "NS" },
            { name: "Ontario", shortCode: "ON" },
            { name: "Prince Edward Island", shortCode: "PE" },
            { name: "Quebec", shortCode: "QC" },
            { name: "Saskatchewan", shortCode: "SK" },
            { name: "Northwest Territories", shortCode: "NT" },
            { name: "Nunavut", shortCode: "NU" },
            { name: "Yukon", shortCode: "YT" }
        ]
    },
    {
        countryName: "Australia",
        countryShortCode: "AU",
        regions: [
            { name: "New South Wales", shortCode: "NSW" },
            { name: "Victoria", shortCode: "VIC" },
            { name: "Queensland", shortCode: "QLD" },
            { name: "Western Australia", shortCode: "WA" },
            { name: "South Australia", shortCode: "SA" },
            { name: "Tasmania", shortCode: "TAS" },
            { name: "Australian Capital Territory", shortCode: "ACT" },
            { name: "Northern Territory", shortCode: "NT" }
        ]
    },
    {
        countryName: "France",
        countryShortCode: "FR",
        regions: [
            { name: "Auvergne-Rhône-Alpes", shortCode: "ARA" },
            { name: "Bourgogne-Franche-Comté", shortCode: "BFC" },
            { name: "Bretagne", shortCode: "BRE" },
            { name: "Centre-Val de Loire", shortCode: "CVL" },
            { name: "Corse", shortCode: "COR" },
            { name: "Grand Est", shortCode: "GES" },
            { name: "Hauts-de-France", shortCode: "HDF" },
            { name: "Île-de-France", shortCode: "IDF" },
            { name: "Normandie", shortCode: "NOR" },
            { name: "Nouvelle-Aquitaine", shortCode: "NAQ" },
            { name: "Occitanie", shortCode: "OCC" },
            { name: "Pays de la Loire", shortCode: "PDL" },
            { name: "Provence-Alpes-Côte d'Azur", shortCode: "PAC" }
        ]
    },
    {
        countryName: "Netherlands",
        countryShortCode: "NL",
        regions: [
            { name: "Drenthe", shortCode: "DR" },
            { name: "Flevoland", shortCode: "FL" },
            { name: "Friesland", shortCode: "FR" },
            { name: "Gelderland", shortCode: "GE" },
            { name: "Groningen", shortCode: "GR" },
            { name: "Limburg", shortCode: "LI" },
            { name: "Noord-Brabant", shortCode: "NB" },
            { name: "Noord-Holland", shortCode: "NH" },
            { name: "Overijssel", shortCode: "OV" },
            { name: "Utrecht", shortCode: "UT" },
            { name: "Zeeland", shortCode: "ZE" },
            { name: "Zuid-Holland", shortCode: "ZH" }
        ]
    },
    {
        countryName: "Israel",
        countryShortCode: "IL",
        regions: [
            { name: "Central District", shortCode: "M" },
            { name: "Haifa District", shortCode: "HA" },
            { name: "Jerusalem District", shortCode: "JM" },
            { name: "Northern District", shortCode: "Z" },
            { name: "Southern District", shortCode: "D" },
            { name: "Tel Aviv District", shortCode: "TA" }
        ]
    }
];

// Export the same interface as the original country-region-data for compatibility
export { reducedCountryData as default };
