import React, { useState, useRef, useCallback } from 'react';
import '../css/overview.css';

// 컴포넌트 import
import World from './World';
import Korea from './Korea';

// 데이터 import
import world from '../data/countries-110m.json';
import countriesData from '../data/countries.js';
import koreaEnergySource from '../data/json/korea_energy_source.json';
import energyPrice from '../data/json/south_korea_energy_price_24_avg.json';
import southKoreaEnergyAll from '../data/json/south_korea_energy_all.json';
import southKoreaEnergyProperty from '../data/json/south_korea_energy_property.json';

const Overview = () => {
  // State variables
  const [currentYear, setCurrentYear] = useState(2018);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [currentView, setCurrentView] = useState('world'); // 'world' or 'korea'
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [detailCountry, setDetailCountry] = useState(null);
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [energyMixPercentages, setEnergyMixPercentages] = useState({
    fossil: 40.0,      // 화석연료
    nuclear: 30.0,     // 원자력
    renewable: 25.0,   // 신재생에너지
    hydro: 5.0         // 수력
    // 기타 제거, 총합 100%
  });
  const [neededEnergy, setNeededEnergy] = useState(300000);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [showBudgetInfoPopup, setShowBudgetInfoPopup] = useState(false);

  // Tooltip ref
  const tooltipRef = useRef();

  // Calculate global maximum and minimum trade balance values
  const globalTradeBalanceRange = React.useMemo(() => {
    let max = -Infinity;
    let min = Infinity;
    Object.values(countriesData).forEach(country => {
      if (country.trade_balance) {
        Object.values(country.trade_balance).forEach(value => {
          if (!isNaN(value)) {
            if (value > max) max = value;
            if (value < min) min = value;
          }
        });
      }
    });
    return { max, min };
  }, []);

  const globalMaxTradeBalance = globalTradeBalanceRange.max;
  const globalMinTradeBalance = globalTradeBalanceRange.min;

  // Create country name mapping
  const countryNameToData = React.useMemo(() => {
    const mapping = {};
    Object.values(countriesData).forEach(country => {
      mapping[country.name] = country;
    });
    return mapping;
  }, []);

  // Helper function to find country data
  const getCountryData = useCallback((countryName) => {
    if (countryNameToData[countryName]) {
      return countryNameToData[countryName];
    }
    
    const nameVariations = {
      'United States of America': 'United States',
      'Russian Federation': 'Russia',
      'United Kingdom': 'United Kingdom',
      'Democratic Republic of the Congo': 'Dem. Rep. Congo',
      'Central African Republic': 'Central African Rep.',
      'Dominican Rep.': 'Dominican Republic',
      'Eq. Guinea': 'Equatorial Guinea',
      'W. Sahara': 'Western Sahara',
      'eSwatini': 'Eswatini',
      'S. Sudan': 'South Sudan',
      'Côte d\'Ivoire': 'Cote d\'Ivoire',
      'Bosnia and Herz.': 'Bosnia and Herzegovina',
      'Falkland Is.': 'Falkland Islands',
      'Solomon Is.': 'Solomon Islands',
      'Turkiye': 'Turkey'
    };
    
    if (nameVariations[countryName] && countryNameToData[nameVariations[countryName]]) {
      return countryNameToData[nameVariations[countryName]];
    }
    
    return null;
  }, [countryNameToData]);

  // Event handlers
  const handleCountryClick = (event, d) => {
    const countryName = d.properties.name;
    const countryData = getCountryData(countryName);
    
    if (countryName === 'South Korea') {
      setCurrentView('korea');
      setSelectedCountry('South Korea');
    } else if (countryData) {
      setDetailCountry({ name: countryName, data: countryData });
      setShowDetailPanel(true);
    }
  };

  const handleYearChange = (event) => {
    setCurrentYear(parseInt(event.target.value));
  };

  const handleCountrySelect = (event) => {
    const country = event.target.value;
    setSelectedCountry(country);
    if (country === 'South Korea') {
      setCurrentView('korea');
    } else if (country === '') {
      setCurrentView('world');
    }
  };

  const closeDetailPanel = () => {
    setShowDetailPanel(false);
    setDetailCountry(null);
  };

  return (
    <div id="app-container">
      {/* Header with controls */}
      <header>
        <h1>World Electricity Data Explorer</h1>
        <div id="controls">
          <div id="year-control">
            <label htmlFor="year-slider">Year: <span id="year-value">{currentYear}</span></label>
            <input 
              id="year-slider" 
              type="range" 
              min="1980" 
              max="2021" 
              value={currentYear} 
              step="1"
              onChange={handleYearChange}
              onInput={handleYearChange}
            />
            <div className="slider-labels">
              <span>1980</span>
              <span>2021</span>
            </div>
          </div>
          
          <div id="country-control">
            <label htmlFor="country-select">Country</label>
            <select id="country-select" value={selectedCountry} onChange={handleCountrySelect}>
              <option value="">-</option>
              <option value="South Korea">South Korea</option>
            </select>
          </div>
        </div>
      </header>

      {/* 조건부 컴포넌트 렌더링 */}
      {currentView === 'world' && (
        <World
          currentYear={currentYear}
          countriesData={countriesData}
          world={world}
          globalMaxTradeBalance={globalMaxTradeBalance}
          globalMinTradeBalance={globalMinTradeBalance}
          getCountryData={getCountryData}
          showAllCountries={showAllCountries}
          setShowAllCountries={setShowAllCountries}
          handleCountryClick={handleCountryClick}
          tooltipRef={tooltipRef}
        />
      )}

      {currentView === 'korea' && (
        <Korea
          currentYear={currentYear}
          setCurrentYear={setCurrentYear}
          world={world}
          countriesData={countriesData}
          koreaEnergySource={koreaEnergySource}
          southKoreaEnergyAll={southKoreaEnergyAll}
          southKoreaEnergyProperty={southKoreaEnergyProperty}
          energyPrice={energyPrice}
          energyMixPercentages={energyMixPercentages}
          setEnergyMixPercentages={setEnergyMixPercentages}
          neededEnergy={neededEnergy}
          setNeededEnergy={setNeededEnergy}
          showInfoPopup={showInfoPopup}
          setShowInfoPopup={setShowInfoPopup}
          showBudgetInfoPopup={showBudgetInfoPopup}
          setShowBudgetInfoPopup={setShowBudgetInfoPopup}
          tooltipRef={tooltipRef}
        />
      )}

      {/* Detail Panel */}
      {showDetailPanel && detailCountry && (
        <div id="detail-panel">
          <button id="close-detail" onClick={closeDetailPanel}>×</button>
          <h2 id="country-name">{detailCountry.name}</h2>
          <div className="chart-container">
            <h3>Trade Balance Trend</h3>
            <div id="bar-chart"></div>
          </div>
          <div className="data-summary">
            <h3>Key Statistics for <span id="year-value-detail">{currentYear}</span></h3>
            <div id="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Generation</span>
                <span className="stat-value">
                  {(() => {
                    const generationValue = detailCountry.data.net_generation?.[currentYear];
                    const generation = (generationValue != null && !isNaN(Number(generationValue))) ? Number(generationValue) : null;
                    return generation !== null ? `${generation.toLocaleString()} TWh` : '-';
                  })()}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Consumption</span>
                <span className="stat-value">
                  {(() => {
                    const consumptionValue = detailCountry.data.net_consumption?.[currentYear];
                    const consumption = (consumptionValue != null && !isNaN(Number(consumptionValue))) ? Number(consumptionValue) : null;
                    return consumption !== null ? `${consumption.toLocaleString()} TWh` : '-';
                  })()}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Trade Balance</span>
                <span className="stat-value">
                  {(() => {
                    const tradeBalanceValue = detailCountry.data.trade_balance?.[currentYear];
                    const tradeBalance = (tradeBalanceValue != null && !isNaN(Number(tradeBalanceValue))) ? Number(tradeBalanceValue) : null;
                    return tradeBalance !== null ? `${tradeBalance.toFixed(1)} TWh` : '-';
                  })()}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Status</span>
                <span className="stat-value">
                  {(() => {
                    const tradeBalanceValue = detailCountry.data.trade_balance?.[currentYear];
                    const tradeBalance = (tradeBalanceValue != null && !isNaN(Number(tradeBalanceValue))) ? Number(tradeBalanceValue) : null;
                    if (tradeBalance === null) return '-';
                    return tradeBalance > 0 ? 'Net Exporter' : tradeBalance < 0 ? 'Net Importer' : 'Balanced';
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip */}
      <div ref={tooltipRef} id="map-tooltip" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '10px', borderRadius: '5px', fontSize: '12px' }}>
      </div>
    </div>
  );
};

export default Overview;
