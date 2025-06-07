// Country data for World Energy Explorer
// Generated automatically from electricity data
import globalElectricityData from './json/global_electricity_data.json';

// Transform the data to the expected format
const countriesData = {};

let countryId = 1;
Object.entries(globalElectricityData).forEach(([countryName, countryData]) => {
  countriesData[countryId.toString()] = {
    name: countryName,
    region: countryData.region,
    net_generation: countryData.net_generation,
    net_consumption: countryData.net_consumption,
    trade_balance: countryData.trade_balance
  };
  countryId++;
});

export default countriesData; 