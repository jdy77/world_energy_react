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
  // 상태 변수들
  const [currentYear, setCurrentYear] = useState(2023);
  const [currentView, setCurrentView] = useState('world'); // 'world' 또는 'korea'
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [detailCountry, setDetailCountry] = useState(null);
  const [energyMixPercentages, setEnergyMixPercentages] = useState({
    fossil: 40.0,      // 화석연료
    nuclear: 30.0,     // 원자력
    renewable: 25.0,   // 신재생에너지
    hydro: 5.0         // 수력
    // 기타 제거, 총합 100%
  });
  const [neededEnergy, setNeededEnergy] = useState(500);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [showBudgetInfoPopup, setShowBudgetInfoPopup] = useState(false);

  // 툴팁 ref
  const tooltipRef = useRef();

  // 전역 최대/최소 무역수지 값 계산
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

  // 국가 이름 매핑 생성
  const countryNameToData = React.useMemo(() => {
    const mapping = {};
    Object.values(countriesData).forEach(country => {
      mapping[country.name] = country;
    });
    return mapping;
  }, []);

  // 국가 데이터 찾기 헬퍼 함수
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

  // 이벤트 핸들러들
  const handleCountryClick = (event, d) => {
    const countryName = d.properties.name;
    const countryData = getCountryData(countryName);
    
    if (countryName === 'South Korea') {
      setCurrentView('korea');
    } else if (countryData) {
      setDetailCountry({ name: countryName, data: countryData });
      setShowDetailPanel(true);
    }
  };

  const handleYearChange = (event) => {
    setCurrentYear(parseInt(event.target.value));
  };

  const handleViewChange = (view) => {
    if (view === currentView) return; // 같은 뷰를 클릭하면 아무것도 하지 않음
    
    // 현재 view container에 fade-out 클래스 추가
    const currentViewElement = document.querySelector('.view-container:not(.transitioning)');
    if (currentViewElement) {
      currentViewElement.classList.add('fade-out');
      currentViewElement.classList.add('transitioning');
    }
    
    // fade-out이 완료된 후 새로운 뷰로 전환
    setTimeout(() => {
      setCurrentView(view);
      if (view === 'korea') {
        // 한국 뷰에서는 2001년 이전 연도를 2001년으로 조정
        if (currentYear < 2001) {
          setCurrentYear(2001);
        }
      }
      
      // 다음 프레임에서 새로운 뷰의 fade-in 애니메이션 시작
      setTimeout(() => {
        const newViewElement = document.querySelector('.view-container');
        if (newViewElement) {
          newViewElement.classList.remove('transitioning');
          newViewElement.classList.add('fade-in');
        }
      }, 50);
      
    }, 400); // fade-out 애니메이션 시간과 일치
  };

  const closeDetailPanel = () => {
    setShowDetailPanel(false);
    setDetailCountry(null);
  };

  return (
    <div id="app-container">
      {/* 헤더와 컨트롤 */}
      <header>
        <h1>Electricity Data Explorer</h1>
        <div id="controls">
          <div id="year-control">
            <label htmlFor="year-slider">Year: <span id="year-value">{currentYear}</span></label>
            <input 
              id="year-slider" 
              type="range" 
              min={currentView === 'korea' ? "2001" : "1990"} 
              max="2023" 
              value={currentYear} 
              step="1"
              onChange={handleYearChange}
              onInput={handleYearChange}
            />
            <div className="slider-labels">
              <span>{currentView === 'korea' ? '2001' : '1990'}</span>
              <span>2023</span>
            </div>
          </div>
          
          <div id="view-control">
            <label>View</label>
            <div className="view-buttons">
              <button 
                className={`view-button ${currentView === 'world' ? 'active' : ''}`}
                onClick={() => handleViewChange('world')}
              >
                Global Analysis
              </button>
              <button 
                className={`view-button ${currentView === 'korea' ? 'active' : ''}`}
                onClick={() => handleViewChange('korea')}
              >
                Korea Analysis
              </button>
            </div>
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

      {/* 상세 패널 */}
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

      {/* 툴팁 */}
      <div ref={tooltipRef} id="map-tooltip" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '10px', borderRadius: '5px', fontSize: '12px' }}>
      </div>
    </div>
  );
};

export default Overview;
