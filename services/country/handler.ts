import { S3Service } from "@/shared/s3_service";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";

export const getCountries = async (
  event: APIGatewayEvent,
  context: any
): Promise<APIGatewayProxyResult> => {
  try {
    // country iso ex: USA, type ex: surf | snow
    const { country, type } = event.queryStringParameters || {};

    const COUNTRIES_FROM_DB = [
      {
        "ISO3": "USA",
        "name": "United States",
        "region": "US",
        "population_density": "1234923",
        "center_coordinates": [
          -98.35,
          39.5
        ],
        "id": "d24e",
      },
      {
        "ISO3": "ALB",
        "name": "Albania",
        "region": "EMEA",
        "population_density": "1234923",
        "id": "119d"
      },
      {
        "ISO3": "DZA",
        "name": "Algeria",
        "region": "EMEA",
        "population_density": "2234923",
        "id": "f1ba"
      },
      {
        "ISO3": "AND",
        "name": "Andorra",
        "region": "EMEA",
        "population_density": "2234923",
        "id": "0509"
      },
      {
        "ISO3": "AGO",
        "name": "Angola",
        "region": "EMEA",
        "population_density": "5234923",
        "id": "4d74"
      },
      {
        "ISO3": "AUT",
        "name": "Austria",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "2c2e"
      },
      {
        "ISO3": "BHR",
        "name": "Bahrain",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "6cec"
      },
      {
        "ISO3": "BLR",
        "name": "Belarus",
        "region": "EMEA",
        "population_density": "1234923",
        "id": "a513"
      },
      {
        "ISO3": "BEL",
        "name": "Belgium",
        "region": "EMEA",
        "population_density": "2234923",
        "id": "2e71"
      },
      {
        "ISO3": "BEN",
        "name": "Benin",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "e882"
      },
      {
        "ISO3": "BIH",
        "name": "Bosnia and Herzegovina",
        "region": "EMEA",
        "population_density": "1234923",
        "id": "e561"
      },
      {
        "ISO3": "BWA",
        "name": "Botswana",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "b33e"
      },
      {
        "ISO3": "BGR",
        "name": "Bulgaria",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "27d7"
      },
      {
        "ISO3": "BFA",
        "name": "Burkina Faso",
        "region": "EMEA",
        "population_density": "1234923",
        "id": "c0a4"
      },
      {
        "ISO3": "BDI",
        "name": "Burundi",
        "region": "EMEA",
        "population_density": "2234923",
        "id": "3f73"
      },
      {
        "ISO3": "CMR",
        "name": "Cameroon",
        "region": "EMEA",
        "population_density": "2234923",
        "id": "20bf"
      },
      {
        "ISO3": "CPV",
        "name": "Cape Verde",
        "region": "EMEA",
        "population_density": "2234923",
        "id": "0c1d"
      },
      {
        "ISO3": "CAF",
        "name": "Central African Republic",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "05cd"
      },
      {
        "ISO3": "TCD",
        "name": "Chad",
        "region": "EMEA",
        "population_density": "6234923",
        "id": "56ea"
      },
      {
        "ISO3": "COM",
        "name": "Comoros",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "8511"
      },
      {
        "ISO3": "HRV",
        "name": "Croatia",
        "region": "EMEA",
        "population_density": "1234923",
        "id": "1173"
      },
      {
        "ISO3": "CYP",
        "name": "Cyprus",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "f90d"
      },
      {
        "ISO3": "CZE",
        "name": "Czechia",
        "region": "EMEA",
        "population_density": "6234923",
        "id": "7965"
      },
      {
        "ISO3": "COD",
        "name": "Democratic Republic of Congo",
        "region": "EMEA",
        "population_density": "5234923",
        "id": "4477"
      },
      {
        "ISO3": "DNK",
        "name": "Denmark",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "c68d"
      },
      {
        "ISO3": "DJI",
        "name": "Djibouti",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "7e44"
      },
      {
        "ISO3": "EGY",
        "name": "Egypt",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "3364"
      },
      {
        "ISO3": "GNQ",
        "name": "Equatorial Guinea",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "a231"
      },
      {
        "ISO3": "ERI",
        "name": "Eritrea",
        "region": "EMEA",
        "population_density": "5234923",
        "id": "03b6"
      },
      {
        "ISO3": "EST",
        "name": "Estonia",
        "region": "EMEA",
        "population_density": "2234923",
        "id": "0529"
      },
      {
        "ISO3": "ETH",
        "name": "Ethiopia",
        "region": "EMEA",
        "population_density": "5234923",
        "id": "932e"
      },
      {
        "ISO3": "FRO",
        "name": "Faroe Islands",
        "region": "EMEA",
        "population_density": "5234923",
        "id": "de4d"
      },
      {
        "ISO3": "FIN",
        "name": "Finland",
        "region": "EMEA",
        "population_density": "1234923",
        "id": "50ce"
      },
      {
        "ISO3": "FRA",
        "name": "France",
        "region": "EMEA",
        "population_density": "2234923",
        "id": "77f6"
      },
      {
        "ISO3": "GAB",
        "name": "Gabon",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "f5c8"
      },
      {
        "ISO3": "GMB",
        "name": "Gambia",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "6076"
      },
      {
        "ISO3": "GEO",
        "name": "Georgia",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "e244"
      },
      {
        "ISO3": "DEU",
        "name": "Germany",
        "region": "EMEA",
        "population_density": "5234923",
        "id": "f61a"
      },
      {
        "ISO3": "GHA",
        "name": "Ghana",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "13d6"
      },
      {
        "ISO3": "GIB",
        "name": "Gibraltar",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "207a"
      },
      {
        "ISO3": "GRC",
        "name": "Greece",
        "region": "EMEA",
        "population_density": "1234923",
        "id": "9c08"
      },
      {
        "ISO3": "GGY",
        "name": "Guernsey",
        "region": "EMEA",
        "population_density": "0234923",
        "id": "ee12"
      },
      {
        "ISO3": "GIN",
        "name": "Guinea",
        "region": "EMEA",
        "population_density": "5234923",
        "id": "a5ba"
      },
      {
        "ISO3": "GNB",
        "name": "Guinea-Bissau",
        "region": "EMEA",
        "population_density": "6234923",
        "id": "fe3e"
      },
      {
        "ISO3": "HUN",
        "name": "Hungary",
        "region": "EMEA",
        "population_density": "1234923",
        "id": "64a3"
      },
      {
        "ISO3": "ISL",
        "name": "Iceland",
        "region": "EMEA",
        "population_density": "1234923",
        "id": "21f8"
      },
      {
        "ISO3": "IRN",
        "name": "Iran",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "6f10"
      },
      {
        "ISO3": "IRQ",
        "name": "Iraq",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "28d9"
      },
      {
        "ISO3": "IRL",
        "name": "Ireland",
        "region": "EMEA",
        "population_density": "1234923",
        "id": "5f8f"
      },
      {
        "ISO3": "IMN",
        "name": "Isle of Man",
        "region": "EMEA",
        "population_density": "2234923",
        "id": "2b58"
      },
      {
        "ISO3": "ISR",
        "name": "Israel",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "3389"
      },
      {
        "ISO3": "ITA",
        "name": "Italy",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "e865"
      },
      {
        "ISO3": "CIV",
        "name": "Cote d'Ivoire",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "7134"
      },
      {
        "ISO3": "JEY",
        "name": "Jersey",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "5860"
      },
      {
        "ISO3": "JOR",
        "name": "Jordan",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "69eb"
      },
      {
        "ISO3": "KEN",
        "name": "Kenya",
        "region": "EMEA",
        "population_density": "5234923",
        "id": "7ebe"
      },
      {
        "ISO3": "KWT",
        "name": "Kuwait",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "3bfd"
      },
      {
        "ISO3": "LVA",
        "name": "Latvia",
        "region": "EMEA",
        "population_density": "2234923",
        "id": "1bb5"
      },
      {
        "ISO3": "LBN",
        "name": "Lebanon",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "1827"
      },
      {
        "ISO3": "LSO",
        "name": "Lesotho",
        "region": "EMEA",
        "population_density": "5234923",
        "id": "2262"
      },
      {
        "ISO3": "LBR",
        "name": "Liberia",
        "region": "EMEA",
        "population_density": "6234923",
        "id": "b270"
      },
      {
        "ISO3": "LBY",
        "name": "Libya",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "17ba"
      },
      {
        "ISO3": "LIE",
        "name": "Liechtenstein",
        "region": "EMEA",
        "population_density": "2234923",
        "id": "ec5e"
      },
      {
        "ISO3": "LTU",
        "name": "Lithuania",
        "region": "EMEA",
        "population_density": "1234923",
        "id": "f993"
      },
      {
        "ISO3": "LUX",
        "name": "Luxembourg",
        "region": "EMEA",
        "population_density": "1234923",
        "id": "c5ce"
      },
      {
        "ISO3": "MKD",
        "name": "Macedonia",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "f8c5"
      },
      {
        "ISO3": "MDG",
        "name": "Madagascar",
        "region": "EMEA",
        "population_density": "5234923",
        "id": "e912"
      },
      {
        "ISO3": "MWI",
        "name": "Malawi",
        "region": "EMEA",
        "population_density": "5234923",
        "id": "756d"
      },
      {
        "ISO3": "MLI",
        "name": "Mali",
        "region": "EMEA",
        "population_density": "6234923",
        "id": "5e81"
      },
      {
        "ISO3": "MLT",
        "name": "Malta",
        "region": "EMEA",
        "population_density": "1234923",
        "id": "ff7f"
      },
      {
        "ISO3": "MRT",
        "name": "Mauritania",
        "region": "EMEA",
        "population_density": "5234923",
        "id": "9c9f"
      },
      {
        "ISO3": "MUS",
        "name": "Mauritius",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "f7b1"
      },
      {
        "ISO3": "MDA",
        "name": "Moldova",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "fe3e"
      },
      {
        "ISO3": "MCO",
        "name": "Monaco",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "6901"
      },
      {
        "ISO3": "MNE",
        "name": "Montenegro",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "dc9b"
      },
      {
        "ISO3": "MAR",
        "name": "Morocco",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "b9ca"
      },
      {
        "ISO3": "MOZ",
        "name": "Mozambique",
        "region": "EMEA",
        "population_density": "5234923",
        "id": "a86b"
      },
      {
        "ISO3": "NAM",
        "name": "Namibia",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "d41d"
      },
      {
        "ISO3": "NLD",
        "name": "Netherlands",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "764f"
      },
      {
        "ISO3": "NER",
        "name": "Niger",
        "region": "EMEA",
        "population_density": "6234923",
        "id": "1ef5"
      },
      {
        "ISO3": "NGA",
        "name": "Nigeria",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "5b3a"
      },
      {
        "ISO3": "NOR",
        "name": "Norway",
        "region": "EMEA",
        "population_density": "2234923",
        "id": "6cc9"
      },
      {
        "ISO3": "OMN",
        "name": "Oman",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "1108"
      },
      {
        "ISO3": "PSE",
        "name": "Palestine",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "b5a1"
      },
      {
        "ISO3": "POL",
        "name": "Poland",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "658d"
      },
      {
        "ISO3": "PRT",
        "name": "Portugal",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "7f06"
      },
      {
        "ISO3": "QAT",
        "name": "Qatar",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "ecfe"
      },
      {
        "ISO3": "ROU",
        "name": "Romania",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "2c5c"
      },
      {
        "ISO3": "RWA",
        "name": "Rwanda",
        "region": "EMEA",
        "population_density": "5234923",
        "id": "1851"
      },
      {
        "ISO3": "SMR",
        "name": "San Marino",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "61fc"
      },
      {
        "ISO3": "STP",
        "name": "Sao Tome and Principe",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "cdb9"
      },
      {
        "ISO3": "SAU",
        "name": "Saudi Arabia",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "1c95"
      },
      {
        "ISO3": "SEN",
        "name": "Senegal",
        "region": "EMEA",
        "population_density": "5234923",
        "id": "335d"
      },
      {
        "ISO3": "SRB",
        "name": "Serbia",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "0eb4"
      },
      {
        "ISO3": "SVK",
        "name": "Slovakia",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "e962"
      },
      {
        "ISO3": "SVN",
        "name": "Slovenia",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "a83a"
      },
      {
        "ISO3": "SOM",
        "name": "Somalia",
        "region": "EMEA",
        "population_density": "6234923",
        "id": "ac91"
      },
      {
        "ISO3": "ZAF",
        "name": "South Africa",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "f2d2"
      },
      {
        "ISO3": "ESP",
        "name": "Spain",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "6099"
      },
      {
        "ISO3": "SDN",
        "name": "Sudan",
        "region": "EMEA",
        "population_density": "6234923",
        "id": "14ff"
      },
      {
        "ISO3": "SWZ",
        "name": "Swaziland",
        "region": "EMEA",
        "population_density": "5234923",
        "id": "b2bf"
      },
      {
        "ISO3": "SWE",
        "name": "Sweden",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "9e3b"
      },
      {
        "ISO3": "CHE",
        "name": "Switzerland",
        "region": "EMEA",
        "population_density": "2234923",
        "id": "080c"
      },
      {
        "ISO3": "SYR",
        "name": "Syria",
        "region": "EMEA",
        "population_density": "4234923",
        "id": "9737"
      },
      {
        "ISO3": "TZA",
        "name": "Tanzania",
        "region": "EMEA",
        "population_density": "5234923",
        "id": "bfea"
      },
      {
        "ISO3": "TGO",
        "name": "Togo",
        "region": "EMEA",
        "population_density": "5234923",
        "id": "e9f2"
      },
      {
        "ISO3": "TUN",
        "name": "Tunisia",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "b213"
      },
      {
        "ISO3": "TUR",
        "name": "Turkey",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "a2ba"
      },
      {
        "ISO3": "UGA",
        "name": "Uganda",
        "region": "EMEA",
        "population_density": "5234923",
        "id": "5b4c"
      },
      {
        "ISO3": "UKR",
        "name": "Ukraine",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "745c"
      },
      {
        "ISO3": "ARE",
        "name": "United Arab Emirates",
        "region": "EMEA",
        "population_density": "3234923",
        "id": "e5ff"
      },
      {
        "ISO3": "GBR",
        "name": "United Kingdom",
        "region": "EMEA",
        "population_density": "2234923",
        "id": "752d"
      },
      {
        "ISO3": "VAT",
        "name": "Vatican City",
        "region": "EMEA",
        "population_density": "2234923",
        "id": "3e8b"
      },
      {
        "ISO3": "ESH",
        "name": "Western Sahara",
        "region": "EMEA",
        "population_density": "2234923",
        "id": "e490"
      },
      {
        "ISO3": "YEM",
        "name": "Yemen",
        "region": "EMEA",
        "population_density": "5234923",
        "id": "9c80"
      },
      {
        "ISO3": "ZMB",
        "name": "Zambia",
        "region": "EMEA",
        "population_density": "5234923",
        "id": "9204"
      },
      {
        "ISO3": "ZWE",
        "name": "Zimbabwe",
        "region": "EMEA",
        "population_density": "5234923",
        "id": "43a1"
      },
      {
        "ISO3": "BLZ",
        "name": "Belize",
        "region": "LATAM",
        "population_density": "4234923",
        "id": "67c7"
      },
      {
        "ISO3": "CRI",
        "name": "Costa Rica",
        "region": "LATAM",
        "population_density": "3234923",
        "id": "9d0a"
      },
      {
        "ISO3": "SLV",
        "name": "El Salvador",
        "region": "LATAM",
        "population_density": "4234923",
        "id": "506f"
      },
      {
        "ISO3": "GTM",
        "name": "Guatemala",
        "region": "LATAM",
        "population_density": "4234923",
        "id": "2a73"
      },
      {
        "ISO3": "HND",
        "name": "Honduras",
        "region": "LATAM",
        "population_density": "4234923",
        "id": "2c9d"
      },
      {
        "ISO3": "MEX",
        "name": "Mexico",
        "region": "LATAM",
        "population_density": "3234923",
        "id": "de14"
      },
      {
        "ISO3": "NIC",
        "name": "Nicaragua",
        "region": "LATAM",
        "population_density": "4234923",
        "id": "cc36"
      },
      {
        "ISO3": "PAN",
        "name": "Panama",
        "region": "LATAM",
        "population_density": "4234923",
        "id": "a055"
      },
      {
        "ISO3": "ARG",
        "name": "Argentina",
        "region": "LATAM",
        "population_density": "3234923",
        "id": "a690"
      },
      {
        "ISO3": "BOL",
        "name": "Bolivia",
        "region": "LATAM",
        "population_density": "4234923",
        "id": "94ee"
      },
      {
        "ISO3": "BRA",
        "name": "Brazil",
        "region": "LATAM",
        "population_density": "3234923",
        "id": "2f57"
      },
      {
        "ISO3": "CHL",
        "name": "Chile",
        "region": "LATAM",
        "population_density": "3234923",
        "id": "1d11"
      },
      {
        "ISO3": "COL",
        "name": "Colombia",
        "region": "LATAM",
        "population_density": "3234923",
        "id": "ebb2"
      },
      {
        "ISO3": "ECU",
        "name": "Ecuador",
        "region": "LATAM",
        "population_density": "4234923",
        "id": "d68c"
      },
      {
        "ISO3": "GUF",
        "name": "French Guiana",
        "region": "LATAM",
        "population_density": "4234923",
        "id": "7c4f"
      },
      {
        "ISO3": "GUY",
        "name": "Guyana",
        "region": "LATAM",
        "population_density": "4234923",
        "id": "8c08"
      },
      {
        "ISO3": "PRY",
        "name": "Paraguay",
        "region": "LATAM",
        "population_density": "3234923",
        "id": "67d6"
      },
      {
        "ISO3": "PER",
        "name": "Peru",
        "region": "LATAM",
        "population_density": "4234923",
        "id": "865b"
      },
      {
        "ISO3": "SUR",
        "name": "Suriname",
        "region": "LATAM",
        "population_density": "4234923",
        "id": "4be9"
      },
      {
        "ISO3": "URY",
        "name": "Uruguay",
        "region": "LATAM",
        "population_density": "3234923",
        "id": "7d83"
      },
      {
        "ISO3": "VEN",
        "name": "Venezuela",
        "region": "LATAM",
        "population_density": "3234923",
        "id": "cfa6"
      },
      {
        "ISO3": "BHS",
        "name": "Bahamas",
        "region": "LATAM",
        "population_density": "3234923",
        "id": "2b6c"
      },
      {
        "ISO3": "CUB",
        "name": "Cuba",
        "region": "LATAM",
        "population_density": "4234923",
        "id": "f58f"
      },
      {
        "ISO3": "MTQ",
        "name": "Martinique",
        "region": "LATAM",
        "population_density": "4234923",
        "id": "e97d"
      },
      {
        "ISO3": "JAM",
        "name": "Jamaica",
        "region": "LATAM",
        "population_density": "4234923",
        "id": "225b"
      },
      {
        "ISO3": "HTI",
        "name": "Haiti",
        "region": "LATAM",
        "population_density": "5234923",
        "id": "2ff6"
      },
      {
        "ISO3": "DOM",
        "name": "Dominican Republic",
        "region": "LATAM",
        "population_density": "4234923",
        "id": "dc5b"
      },
      {
        "ISO3": "PRI",
        "name": "Puerto Rico",
        "region": "LATAM",
        "population_density": "4234923",
        "center_coordinates": [
          -66.5901,
          18.2208
        ],
        "id": "ee88"
      },
      {
        "ISO3": "BL",
        "name": "Saint-Barthélemy",
        "region": "LATAM",
        "population_density": "4234923",
        "id": "11fc"
      },
      {
        "ISO3": "MAF",
        "name": "Saint Martin",
        "region": "LATAM",
        "population_density": "4234923",
        "id": "4fee"
      },
      {
        "ISO3": "FLK",
        "name": "Falkland Islands (Malvinas)",
        "region": "LATAM",
        "population_density": "4234923",
        "id": "9410"
      }
    ];

    const countries = country ? COUNTRIES_FROM_DB.filter(c => c.ISO3 === country) : COUNTRIES_FROM_DB;

    if (countries.length === 1 && type === 'surf') {
      const SURF_BREAKS_FROM_DB =
        [
          {
            "name": "San Clemente",
            "country": "USA",
            "coordinates": [
              -118.2119,
              33.9263
            ],
            "id": "6124"
          },
          {
            "name": "Mayport Poles",
            "country": "USA",
            "coordinates": [
              -81.3964,
              30.3915
            ],
            "photographers": [
              "shredshots",
              "inksurfco"
            ],
            "id": "c1e6"
          },
          {
            "name": "Oceanside",
            "country": "USA",
            "coordinates": [
              -117.3795,
              33.1959
            ],
            "id": "f738"
          },
          {
            "name": "Washout",
            "country": "USA",
            "coordinates": [
              -79.9075,
              32.6687
            ],
            "id": "ffcb"
          },
          {
            "id": "e4ac",
            "name": "Lido Key Beach",
            "country": "USA",
            "coordinates": [
              -82.5772,
              27.3111
            ]
          },
          {
            "id": "2557",
            "name": "Daytona Beach",
            "country": "USA",
            "coordinates": [
              -81.0228,
              29.2108
            ]
          }
        ];
      const countryWithSurfSpots = { ...countries[0], surf_breaks: SURF_BREAKS_FROM_DB };
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({
          message: `Successfully retrieved countries.`,
          results: {
            countries: [countryWithSurfSpots]
          }
        }),
      };
    } else if (countries.length > 1 && type === 'surf') {
      for (let i = 0; i < countries.length; i++) {
        const country = countries[i];
        const s3ReturnObject = await S3Service.listBucketDirectoriesWithPrefix(S3Service.SURF_BUCKET, country.ISO3);
        countries[i] = { ...countries[i], surf_breaks_total: s3ReturnObject?.KeyCount ?? 0 } as any;
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: `Successfully retrieved countries.`,
        results: {
          countries
        }
      }),
    };
  } catch (error) {
    console.error("Error getting countries: ", error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: "Error getting countries",
        error: error,
      }),
    };
  }
};
