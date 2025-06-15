import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import '../css/world.css';

const World = ({ 
  currentYear, 
  countriesData, 
  world, 
  globalMaxTradeBalance, 
  globalMinTradeBalance,
  getCountryData,
  handleCountryClick,
  tooltipRef
}) => {
  const mapRef = useRef();
  const horizontalChartRef = useRef();
  const comparisonChartRef = useRef();
  const trendChartRef = useRef();
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState('select'); // 'select' or 'deselect'
  const hasInitialized = useRef(false);
  
  // 즉시 드래그 상태 접근을 위한 ref 추가
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef('select');



  // 지도 국가명을 데이터 국가명으로 다시 변환하기 위한 역매핑
  const getDataCountryName = useCallback((mapCountryName) => {
    const reverseMapping = {
      'United States of America': 'United States',
      'Russian Federation': 'Russia',
      'Republic of Korea': 'South Korea',
      'Democratic People\'s Republic of Korea': 'North Korea',
      'Iran (Islamic Republic of)': 'Iran',
      'Venezuela (Bolivarian Republic of)': 'Venezuela',
      'Bolivia (Plurinational State of)': 'Bolivia',
      'United Republic of Tanzania': 'Tanzania',
      'Republic of the Congo': 'Congo',
      'Czechia': 'Czech Republic',
      'North Macedonia': 'Macedonia',
      'Republic of Moldova': 'Moldova',
      'Syrian Arab Republic': 'Syria',
      'Lao People\'s Democratic Republic': 'Laos',
      'Viet Nam': 'Vietnam',
      'Brunei Darussalam': 'Brunei'
    };
    
    return reverseMapping[mapCountryName] || mapCountryName;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // selectedCountries 초기화 (처음에는 아무 국가도 선택하지 않음)
  useEffect(() => {
    if (!hasInitialized.current) {
      setSelectedCountries([]); // 빈 배열로 시작
      hasInitialized.current = true;
    }
  }, [currentYear, countriesData]);

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current) return;
    
    const svg = d3.select(mapRef.current);
    const container = svg.node().parentElement;
    
    if (!container) return;
    
    svg.selectAll("*").remove(); // 이전 내용 제거
    
    const land = feature(world, world.objects.countries);
    
    // 고정 크기로 지도 렌더링 (여백 없이)
    const mapWidth = 600;  // 적당한 크기
    const mapHeight = 400;
    
    const projection = d3.geoNaturalEarth1().fitSize([mapWidth, mapHeight], land);
    const path = d3.geoPath(projection);
    
    // SVG 크기를 고정 크기로 설정
    svg.attr('width', mapWidth).attr('height', mapHeight);
    
    // g 요소에 transform 없이 렌더링
    const mapGroup = svg.append('g');
    
    mapGroup.selectAll('path')
      .data(land.features)
      .join('path')
      .attr('d', path)
      .attr('fill', '#eee')
      .attr('stroke', '#999')
      .style('cursor', 'pointer')
      .on('click', (event, d) => handleCountryClick(event, d))
      .on('mouseover', (event, d) => handleMouseOver(event, d))
      .on('mouseout', handleMouseOut);
    
    // 그라데이션 범례 추가
    const legend = svg.append('g')
      .attr('class', 'map-legend')
      .attr('transform', `translate(30, ${mapHeight - 120})`);
    
    // 그라데이션 정의
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'legend-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    
    // 그라데이션 stops 추가
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#388e3c'); // 강한 수출 (green)
    
    gradient.append('stop')
      .attr('offset', '25%')
      .attr('stop-color', '#e8f5e8'); // 적당한 수출 (light green)
    
    gradient.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', '#ffffff'); // 중간 (white)
    
    gradient.append('stop')
      .attr('offset', '75%')
      .attr('stop-color', '#ffccbc'); // 적당한 수입 (light brownish orange)
    
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#d84315'); // 강한 수입 (brownish orange)
    
    // 범례 배경
    legend.append('rect')
      .attr('class', 'legend-background')
      .attr('x', -8)
      .attr('y', -15)
      .attr('width', 80)
      .attr('height', 90)
      .attr('fill', 'rgba(255, 255, 255, 0.9)')
      .attr('stroke', '#ddd')
      .attr('stroke-width', 1)
      .attr('rx', 4);
    
    // 그라데이션 바
    legend.append('rect')
      .attr('class', 'legend-gradient-bar')
      .attr('x', 0)
      .attr('y', 15)
      .attr('width', 15)
      .attr('height', 50)
      .attr('fill', 'url(#legend-gradient)')
      .attr('stroke', '#999')
      .attr('stroke-width', 0.5);
    
    // 범례 제목
    legend.append('text')
      .attr('class', 'legend-title')
      .attr('x', 0)
      .attr('y', -5)
      .style('font-size', '10px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .text('Trade Balance');
    
    // 강한 수출 label
    legend.append('text')
      .attr('class', 'legend-label')
      .attr('x', 20)
      .attr('y', 20)
      .style('font-size', '9px')
      .style('fill', '#333')
      .text('High');
    
    // 수출 label
    legend.append('text')
      .attr('class', 'legend-label')
      .attr('x', 20)
      .attr('y', 30)
      .style('font-size', '8px')
      .style('fill', '#666')
      .text('Export');
    
    // 중간 label
    legend.append('text')
      .attr('class', 'legend-label')
      .attr('x', 20)
      .attr('y', 42)
      .style('font-size', '8px')
      .style('fill', '#666')
      .text('Balanced');
    
    // 수입 label
    legend.append('text')
      .attr('class', 'legend-label')
      .attr('x', 20)
      .attr('y', 54)
      .style('font-size', '8px')
      .style('fill', '#666')
      .text('Import');
    
    // 강한 수입 label
    legend.append('text')
      .attr('class', 'legend-label')
      .attr('x', 20)
      .attr('y', 64)
      .style('font-size', '9px')
      .style('fill', '#333')
      .text('Low');
    
    updateChoropleth();
  }, [currentYear, getCountryData]); // eslint-disable-line react-hooks/exhaustive-deps

  // 조화평면도 색상 업데이트
  const updateChoropleth = useCallback(() => {
    if (!mapRef.current) return;
    
    const svg = d3.select(mapRef.current);
    const currentMetric = 'trade_balance';
    
    // 현재 메트릭과 연도에 대한 모든 값 수집
    const values = [];
    Object.values(countriesData).forEach(country => {
      const value = country[currentMetric]?.[currentYear];
      if (value != null && !isNaN(Number(value))) {
        values.push(Number(value));
      }
    });
    
    if (values.length === 0) return;
    
    // 수출과 수입에 대한 색상 스케일 생성 (음수 = 수입, 양수 = 수출)
    const colorScale = value => {
      const deepBrownOrangeColor = "#d84315"; // 강한 수입 (negative values) - Brownish Orange
      const whiteColor = "#ffffff";          // 중간
      const greenColor = "#388e3c";          // 강한 수출 (positive values) - Green
      
      if (value < 0) {
        // 수입 (음수) - use brownish orange scale
        return d3.scaleLinear()
          .domain([globalMinTradeBalance, 0])
          .range([deepBrownOrangeColor, whiteColor])
          .interpolate(d3.interpolateHcl)
          (Math.max(value, globalMinTradeBalance));
      } else {
        // 수출 (양수) - use green scale  
        return d3.scaleLinear()
          .domain([0, globalMaxTradeBalance])
          .range([whiteColor, greenColor])
          .interpolate(d3.interpolateHcl)
          (Math.min(value, globalMaxTradeBalance));
      }
    };
    
    // 국가 색상과 강조 업데이트
    svg.select('g').selectAll('path')
      .attr('fill', d => {
        const mapCountryName = d.properties.name;
        const dataCountryName = getDataCountryName(mapCountryName);
        const countryData = getCountryData(dataCountryName);
        
        if (!countryData) {
          // 데이터셋에 없는 국가 - 밝은 회색 유지
          return '#eee';
        }
        
        if (!countryData[currentMetric] || countryData[currentMetric][currentYear] == null) {
          // 데이터에 있는 국가지만 수출과 수입 거래 잔액이 없음 - 어두운 회색
          return '#999999';
        }
        
        const value = Number(countryData[currentMetric][currentYear]);
        if (isNaN(value)) {
          // 데이터에 있는 국가지만 수출과 수입 거래 잔액이 유효하지 않음 - 어두운 회색
          return '#999999';
        }
        return colorScale(value);
      })
      .attr('fill-opacity', d => {
        const mapCountryName = d.properties.name;
        const dataCountryName = getDataCountryName(mapCountryName);
        const isSelected = selectedCountries.includes(dataCountryName);
        const hasSelections = selectedCountries.length > 0;
        
        if (hasSelections) {
          return isSelected ? 1.0 : 0.2; // 선택되지 않은 국가들은 흐리게 보임
        }
        return 1.0; // 아무 국가도 선택되지 않았을 땐 일반 투명도
      })
      .attr('stroke', d => {
        const mapCountryName = d.properties.name;
        const dataCountryName = getDataCountryName(mapCountryName);
        const isSelected = selectedCountries.includes(dataCountryName);
        return isSelected ? '#2E7D32' : '#999';
      })
      .attr('stroke-width', d => {
        const mapCountryName = d.properties.name;
        const dataCountryName = getDataCountryName(mapCountryName);
        const isSelected = selectedCountries.includes(dataCountryName);
        return isSelected ? 2 : 0.5;
      })
      .attr('stroke-opacity', d => {
        const mapCountryName = d.properties.name;
        const dataCountryName = getDataCountryName(mapCountryName);
        const isSelected = selectedCountries.includes(dataCountryName);
        const hasSelections = selectedCountries.length > 0;
        
        if (hasSelections) {
          return isSelected ? 1.0 : 0.4; // 선택되지 않은 국가들은 흐리게 보임
        }
        return 1.0; // 아무 국가도 선택되지 않았을 땐 일반 투명도
      });
  }, [currentYear, getCountryData, globalMaxTradeBalance, globalMinTradeBalance, selectedCountries, getDataCountryName]); // eslint-disable-line react-hooks/exhaustive-deps

  // 선택된 국가가 변경될 때 조화평면도 업데이트
  useEffect(() => {
    updateChoropleth();
  }, [updateChoropleth]);

  // 가로 차트 초기화
  useEffect(() => {
    const timer = setTimeout(() => {
      if (horizontalChartRef.current) {
        if (horizontalChartRef.current.parentElement) {
          horizontalChartRef.current.parentElement.scrollTop = 0;
        }
        drawHorizontalChart();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [currentYear, selectedCountries]); // eslint-disable-line react-hooks/exhaustive-deps

  const drawHorizontalChart = useCallback(() => {
    if (!horizontalChartRef.current) return;
    
    const svg = d3.select(horizontalChartRef.current);
    const container = svg.node().parentElement;
    
    if (!container) return;
    
    // 세로 막대 차트에 대한 크기 설정
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const width = containerWidth;
    const height = containerHeight;
    
    svg.selectAll("*").remove();
    
    const margin = { top: 50, right: 25, bottom: 55, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = Math.min(height - margin.top - margin.bottom, 450); // 최대 높이를 450px로 제한
    
    // 데이터 준비 - 모든 국가 포함 (필터링 없음)
    const allChartData = [];
    Object.values(countriesData).forEach(country => {
      const generation = Number(country.net_generation?.[currentYear]);
      const consumption = Number(country.net_consumption?.[currentYear]);
      const tradeBalanceValue = country.trade_balance?.[currentYear];
      
      // 유효한 발전량과 소비량이 있는 국가만 포함
      if (!isNaN(generation) && !isNaN(consumption)) {
        const tradeBalance = (tradeBalanceValue != null && !isNaN(Number(tradeBalanceValue))) 
          ? Number(tradeBalanceValue) 
          : null;
        
        allChartData.push({
          country: country.name,
          generation: generation,
          consumption: consumption,
          tradeBalance: tradeBalance,
          hasValidTradeBalance: tradeBalance !== null
        });
      }
    });
    
    // 소비량에 따라 정렬 (가장 큰 것부터 가장 작은 것까지) 그리고 모든 국가 사용
    const chartData = allChartData.sort((a, b) => b.consumption - a.consumption);
    
    if (chartData.length === 0) {
      svg.attr('width', width).attr('height', height);
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .text('No data available for this year')
        .style('font-size', '16px')
        .style('fill', '#666');
      return;
    }

    // SVG 크기 설정
    svg.attr('width', width).attr('height', height);
    
    // 스케일 생성 - 최대 값을 발전량 + 수입으로 조정
    let maxValue = 0;
    chartData.forEach(country => {
      const generationValue = country.generation;
      const importValue = country.hasValidTradeBalance && country.tradeBalance < 0 ? Math.abs(country.tradeBalance) : 0;
      const totalValue = generationValue + importValue;
      maxValue = Math.max(maxValue, country.consumption, totalValue);
    });
    maxValue += 10; // 10 TWh 버퍼 추가
    
    const yScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([chartHeight, 0]);
    
    const xScale = d3.scaleBand()
      .domain(chartData.map(d => d.country))
      .range([0, chartWidth])
      .padding(0.1);
    
    // 차트 그룹 생성
    const chartGroup = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // 그리드 라인 추가 (수평)
    const yAxis = d3.axisLeft(yScale)
      .ticks(4)
      .tickSize(-chartWidth)
      .tickFormat(d => d >= 1000 ? `${(d/1000).toFixed(0)}k` : d);
    
    chartGroup.append('g')
      .attr('class', 'chart-grid')
      .call(yAxis)
      .selectAll('text')
      .style('font-size', '8px')
      .style('fill', '#666');
    
    // 그리드 라인 라벨 제거 (그리드 라인만 유지)
    chartGroup.select('.chart-grid')
      .selectAll('text').remove();
    
    // 각 국가에 대한 막대 그리기
    chartData.forEach((country, i) => {
      const xPos = xScale(country.country);
      const barWidthAdjusted = Math.max(xScale.bandwidth() * 0.8, 4);
      const barOffset = (xScale.bandwidth() - barWidthAdjusted) / 2;
      
      // 발전량 막대 (파란색)
      const generationHeight = chartHeight - yScale(country.generation);
      chartGroup.append('rect')
        .attr('class', 'generation-bar')
        .attr('data-country-index', i)
        .attr('data-country-name', country.country)
        .attr('x', xPos + barOffset)
        .attr('y', yScale(country.generation))
        .attr('width', barWidthAdjusted / 2 - 1)
        .attr('height', generationHeight)
        .attr('fill', '#2196F3')
        .attr('fill-opacity', 0.8)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this).classed('highlighted', true);
          showBarTooltip(event, country, 'generation-with-trade');
        })
        .on('mouseout', function() {
          d3.select(this).classed('highlighted', false);
          hideTooltip();
        });
      
      // 소비량 막대 (회색)
      const consumptionHeight = chartHeight - yScale(country.consumption);
      chartGroup.append('rect')
        .attr('class', 'consumption-bar')
        .attr('data-country-index', i)
        .attr('data-country-name', country.country)
        .attr('x', xPos + barOffset + barWidthAdjusted / 2)
        .attr('y', yScale(country.consumption))
        .attr('width', barWidthAdjusted / 2 - 1)
        .attr('height', consumptionHeight)
        .attr('fill', '#999')
        .attr('fill-opacity', 0.8)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this).classed('highlighted', true);
          showBarTooltip(event, country, 'consumption');
        })
        .on('mouseout', function() {
          d3.select(this).classed('highlighted', false);
          hideTooltip();
        });
      
      // 수출과 수입 거래 잔액 박스 (유효한 수출과 수입 거래 잔액이 있고 0이 아닌 경우에만)
      if (country.hasValidTradeBalance && Math.abs(country.tradeBalance) > 0.01) {
        const tradeBalance = country.tradeBalance;
        const tradeAmount = Math.abs(tradeBalance);
        const boxHeight = Math.abs(yScale(0) - yScale(tradeAmount));
        const generationTop = yScale(country.generation);
        const boxX = xPos + barOffset;
        const boxWidth = barWidthAdjusted / 2 - 1;
        
        // 수입 (음수 수출과 수입 거래 잔액): 강한 주황색, 발전량 막대 위
        // 수출 (양수 수출과 수입 거래 잔액): 파란색, 발전량 막대 아래
        const isImport = tradeBalance < 0;
        const boxColor = isImport ? '#ff5722' : '#00897b';
        const boxY = isImport ? generationTop - boxHeight : generationTop;
        
        // 수출과 수입 거래 잔액 금액에 대한 대시 사각형
        chartGroup.append('rect')
          .attr('class', 'trade-balance-box')
          .attr('data-country-index', i)
          .attr('data-country-name', country.country)
          .attr('x', boxX)
          .attr('y', boxY)
          .attr('width', boxWidth)
          .attr('height', boxHeight)
          .attr('fill', boxColor)
          .attr('fill-opacity', 0.5)
          .attr('stroke', boxColor)
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3')
          .style('cursor', 'pointer')
          .on('mouseover', function(event, d) {
            d3.select(this).attr('stroke-width', 2);
            showBarTooltip(event, country, 'trade');
          })
          .on('mouseout', function() {
            d3.select(this).attr('stroke-width', 1);
            hideTooltip();
          });
        
        // 수출과 수입 거래 잔액 박스의 전체 높이를 넘는 화살표
        const arrowX = boxX + boxWidth / 2;
        const arrowStartY = isImport ? boxY + boxHeight : boxY;
        const arrowEndY = isImport ? boxY : boxY + boxHeight;
        
        // 박스 높이에 따라 화살표 머리 크기 조정
        const headSize = Math.min(6, boxHeight * 0.4);
        
        // 화살표 줄 - 전체 높이
        chartGroup.append('line')
          .attr('class', 'trade-arrow-shaft')
          .attr('data-country-index', i)
          .attr('data-country-name', country.country)
          .attr('x1', arrowX)
          .attr('y1', arrowStartY)
          .attr('x2', arrowX)
          .attr('y2', arrowEndY)
          .attr('stroke', boxColor)
          .attr('stroke-width', 3)
          .style('cursor', 'pointer')
          .on('mouseover', function(event, d) {
            d3.select(this).attr('stroke-width', 5);
            showBarTooltip(event, country, 'trade');
          })
          .on('mouseout', function() {
            d3.select(this).attr('stroke-width', 3);
            hideTooltip();
          });
        
        // 방향 끝에 있는 화살표 머리
        if (headSize > 1) { // Only draw arrow head if big enough
          const arrowHeadY = isImport ? boxY : boxY + boxHeight;
          const arrowHeadPoints = isImport
            ? `${arrowX},${arrowHeadY} ${arrowX - headSize},${arrowHeadY + headSize} ${arrowX + headSize},${arrowHeadY + headSize}`
            : `${arrowX},${arrowHeadY} ${arrowX - headSize},${arrowHeadY - headSize} ${arrowX + headSize},${arrowHeadY - headSize}`;
          
          chartGroup.append('polygon')
            .attr('class', 'trade-arrow-head')
            .attr('data-country-index', i)
            .attr('data-country-name', country.country)
            .attr('points', arrowHeadPoints)
            .attr('fill', boxColor)
            .style('cursor', 'pointer')
            .on('mouseover', function(event, d) {
              d3.select(this).attr('fill-opacity', 0.8);
              showBarTooltip(event, country, 'trade');
            })
            .on('mouseout', function() {
              d3.select(this).attr('fill-opacity', 1);
              hideTooltip();
            });
        }
      }
    });
    
    // 국가명과 선택 버튼이 있는 x축 추가
    const xAxisGroup = chartGroup.append('g')
      .attr('class', 'chart-axis')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(xScale));
    
    // 선택에 따라 x축 텍스트와 색상 스타일 - 선택된 국가에 글로우 효과 추가
    xAxisGroup.selectAll('text')
      .style('font-size', '8px')
      .style('fill', d => {
        const isSelected = selectedCountries.includes(d);
        return isSelected ? '#2196F3' : '#333';
      })
      .style('font-weight', d => {
        const isSelected = selectedCountries.includes(d);
        return isSelected ? '600' : 'normal';
      })
      .style('filter', d => {
        const isSelected = selectedCountries.includes(d);
        return isSelected ? 'drop-shadow(0 0 3px rgba(33, 150, 243, 0.6))' : 'none';
      })
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .attr('dy', '0.7em');
    
    // 각 국가에 대한 선택 버튼/영역 추가 (국가명 영역 전체를 커버하는 큰 투명 버튼)
    chartData.forEach((country, i) => {
      const xPos = xScale(country.country);
      
      // 모든 이벤트를 처리하기 위한 버튼 그룹 생성
      const buttonGroup = chartGroup.append('g')
        .attr('class', 'country-selector-group')
        .attr('data-country', country.country)
        .style('cursor', 'pointer')
        .style('user-select', 'none');
      
      // 큰 투명 클릭 영역 - x축 텍스트 영역 전체를 커버
      const clickAreaWidth = xScale.bandwidth();
      const clickAreaHeight = 67.5; // 1.5배 더 긴 높이 (45 * 1.5 = 67.5)
      const clickAreaX = xPos;
      const clickAreaY = chartHeight - 5; // 차트 바로 아래부터 시작
      
      const clickArea = buttonGroup.append('rect')
        .attr('class', 'country-click-area')
        .attr('x', clickAreaX)
        .attr('y', clickAreaY)
        .attr('width', clickAreaWidth)
        .attr('height', clickAreaHeight)
        .attr('fill', 'transparent') // 완전히 투명
        .attr('stroke', 'none'); // 테두리 없음
      
      // 이벤트 핸들러
      buttonGroup
        .on('mousedown', function(event) {
          event.preventDefault();
          event.stopPropagation();
          
          const currentlySelected = selectedCountries.includes(country.country);
          
          // 드래그 모드 시작 - 선택하거나 선택 해제하는지 확인
          const newDragMode = currentlySelected ? 'deselect' : 'select';
          
          setIsDragging(true);
          setDragMode(newDragMode);
          isDraggingRef.current = true;
          dragModeRef.current = newDragMode;
          
          // 이 국가를 즉시 토글
          toggleCountrySelection(country.country);
        })
        .on('mouseenter', function(event) {
          if (isDraggingRef.current) {
            // 드래그 중 - 이 국가에 대한 드래그 모드 적용
            const currentlySelected = selectedCountries.includes(country.country);
            
            if (dragModeRef.current === 'select' && !currentlySelected) {
              toggleCountrySelection(country.country);
            } else if (dragModeRef.current === 'deselect' && currentlySelected) {
              toggleCountrySelection(country.country);
            }
          } else {
            // 드래그 중이 아닐 때 호버 효과 - 클릭 영역에 약간의 배경색 표시
            clickArea.attr('fill', 'rgba(33, 150, 243, 0.1)');
          }
        })
        .on('mouseleave', function(event) {
          if (!isDraggingRef.current) {
            // 호버 효과 초기화
            clickArea.attr('fill', 'transparent');
          }
        });
    });
    
    // 모두 선택 / 모두 해제 버튼 추가
    const buttonY = chartHeight + 77; // 더 아래로 이동 (55 + 22 = 77)
    const buttonGroup = chartGroup.append('g')
      .attr('class', 'bulk-action-buttons');
    
    // 모두 선택 버튼
    const selectAllButton = buttonGroup.append('g')
      .attr('class', 'bulk-action-button select-all')
      .style('cursor', 'pointer');
    
    selectAllButton.append('rect')
      .attr('x', chartWidth / 2 - 80)
      .attr('y', buttonY)
      .attr('width', 70)
      .attr('height', 20)
      .attr('fill', 'rgba(255, 255, 255, 0.9)')
      .attr('stroke', '#2196F3')
      .attr('stroke-width', 1)
      .attr('rx', 4);
    
    selectAllButton.append('text')
      .attr('x', chartWidth / 2 - 45)
      .attr('y', buttonY + 13)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('font-weight', '500')
      .style('fill', '#2196F3')
      .style('pointer-events', 'none')
      .text('전체 선택');
    
    // 모두 해제 버튼
    const clearAllButton = buttonGroup.append('g')
      .attr('class', 'bulk-action-button clear-all')
      .style('cursor', 'pointer');
    
    clearAllButton.append('rect')
      .attr('x', chartWidth / 2 + 10)
      .attr('y', buttonY)
      .attr('width', 70)
      .attr('height', 20)
      .attr('fill', 'rgba(255, 255, 255, 0.9)')
      .attr('stroke', '#f44336')
      .attr('stroke-width', 1)
      .attr('rx', 4);
    
    clearAllButton.append('text')
      .attr('x', chartWidth / 2 + 45)
      .attr('y', buttonY + 13)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('font-weight', '500')
      .style('fill', '#f44336')
      .style('pointer-events', 'none')
      .text('전체 선택 해제');
    
    // 이벤트 핸들러 추가
    selectAllButton
      .on('click', function() {
        const allCountries = chartData.map(d => d.country);
        setSelectedCountries(allCountries);
      })
      .on('mouseenter', function() {
        d3.select(this).select('rect')
          .attr('fill', '#e3f2fd')
          .attr('stroke', '#1976D2');
        d3.select(this).select('text')
          .style('fill', '#1976D2');
      })
      .on('mouseleave', function() {
        d3.select(this).select('rect')
          .attr('fill', 'rgba(255, 255, 255, 0.9)')
          .attr('stroke', '#2196F3');
        d3.select(this).select('text')
          .style('fill', '#2196F3');
      });
    
    clearAllButton
      .on('click', function() {
        setSelectedCountries([]);
      })
      .on('mouseenter', function() {
        d3.select(this).select('rect')
          .attr('fill', '#ffebee')
          .attr('stroke', '#d32f2f');
        d3.select(this).select('text')
          .style('fill', '#d32f2f');
      })
      .on('mouseleave', function() {
        d3.select(this).select('rect')
          .attr('fill', 'rgba(255, 255, 255, 0.9)')
          .attr('stroke', '#f44336');
        d3.select(this).select('text')
          .style('fill', '#f44336');
      });
    
    // 차트 제목 추가
    svg.append('text')
      .attr('class', 'chart-title')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .text(`Global Electricity Overview ${currentYear}`);
    
    // y축 라벨 추가
    chartGroup.append('text')
      .attr('class', 'chart-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight / 2)
      .attr('y', -28)
      .attr('text-anchor', 'middle')
      .style('font-size', '9px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .text('Electricity (TWh)');
    
    // 범례 추가 - 상단 오른쪽에 위치
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 120}, 65)`);
    
    const legendData = [
      { label: 'Generation', color: '#2196F3', opacity: 0.8 },
      { label: 'Consumption', color: '#999', opacity: 0.8 },
      { label: 'Net Import', color: '#ff5722', opacity: 0.3 },
      { label: 'Net Export', color: '#00897b', opacity: 0.3 }
    ];
    
    legendData.forEach((item, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 12})`);
      
      legendItem.append('rect')
        .attr('width', 8)
        .attr('height', 8)
        .attr('fill', item.color)
        .attr('fill-opacity', item.opacity);
      
      legendItem.append('text')
        .attr('x', 12)
        .attr('y', 7)
        .style('font-size', '9px')
        .style('fill', '#333')
        .text(item.label);
    });

    // 툴팁 함수
    function showBarTooltip(event, country, type) {
      if (!tooltipRef.current) return;
      
      const tooltip = d3.select(tooltipRef.current);
      let content = `<div><strong>${country.country}</strong></div>`;
      
      if (type === 'generation') {
        content += `<div>Generation: ${country.generation.toFixed(1)} TWh</div>`;
      } else if (type === 'generation-with-trade') {
        content += `<div>Generation: ${country.generation.toFixed(1)} TWh</div>`;
        if (country.hasValidTradeBalance && Math.abs(country.tradeBalance) > 0.01) {
          const tradeType = country.tradeBalance > 0 ? 'Net Exports' : 'Net Imports';
          content += `<div>${tradeType}: ${Math.abs(country.tradeBalance).toFixed(1)} TWh</div>`;
          content += `<div>Trade Balance: ${country.tradeBalance.toFixed(1)} TWh</div>`;
        } else {
          content += `<div>Trade Balance: Data not available</div>`;
        }
      } else if (type === 'consumption') {
        content += `<div>Consumption: ${country.consumption.toFixed(1)} TWh</div>`;
      } else if (type === 'trade') {
        if (country.hasValidTradeBalance) {
          const tradeType = country.tradeBalance > 0 ? 'Net Exports' : 'Net Imports';
          content += `<div>${tradeType}: ${Math.abs(country.tradeBalance).toFixed(1)} TWh</div>`;
          content += `<div>Trade Balance: ${country.tradeBalance.toFixed(1)} TWh</div>`;
        } else {
          content += `<div>Trade Balance: Data not available</div>`;
        }
      }
      
      tooltip.style('opacity', 1)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .html(content);
    }
    
    function hideTooltip() {
      if (tooltipRef.current) {
        d3.select(tooltipRef.current).style('opacity', 0);
      }
    }
  }, [currentYear, getCountryData, selectedCountries, isDragging, dragMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseOver = (event, d) => {
    const mapCountryName = d.properties.name;
    const dataCountryName = getDataCountryName(mapCountryName);
    const countryData = getCountryData(dataCountryName);
    
    if (tooltipRef.current) {
      const tooltip = d3.select(tooltipRef.current);
      if (countryData) {
        const tradeBalanceValue = countryData.trade_balance?.[currentYear];
        const tradeBalance = (tradeBalanceValue != null && !isNaN(Number(tradeBalanceValue))) ? Number(tradeBalanceValue) : null;
        
        tooltip.style('opacity', 1)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
          .html(`
            <div><strong>${dataCountryName}</strong></div>
            <div>Trade Balance: ${tradeBalance !== null ? tradeBalance.toFixed(1) + ' TWh' : 'Data not available'}</div>
          `);
      } else {
        tooltip.style('opacity', 1)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
          .html(`
            <div><strong>${mapCountryName}</strong></div>
            <div>No data available</div>
          `);
      }
    }
  };

  const handleMouseOut = () => {
    if (tooltipRef.current) {
      d3.select(tooltipRef.current).style('opacity', 0);
    }
  };

  const drawComparisonChart = useCallback(() => {
    if (!comparisonChartRef.current || selectedCountries.length === 0) {
      // 선택된 국가가 없을 때 차트 초기화
      if (comparisonChartRef.current) {
        d3.select(comparisonChartRef.current).selectAll("*").remove();
      }
      return;
    }
    
    const svg = d3.select(comparisonChartRef.current);
    const container = svg.node().parentElement;
    
    if (!container) return;
    
    // 비교 차트에 대한 크기 설정 - 전체 컨테이너 사용
    const containerWidth = container.clientWidth || 400;
    const containerHeight = container.clientHeight || 300;
    const width = containerWidth;
    const height = containerHeight - 5; // 거의 전체 컨테이너 높이 사용
    
    svg.selectAll("*").remove();
    
    const margin = { top: 30, right: 10, bottom: 70, left: 50 }; // 공간을 채우기 위해 최적화된 여백
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // 선택된 국가에 대한 비교 데이터 준비
    const comparisonData = [];
    selectedCountries.forEach(countryName => {
      Object.values(countriesData).forEach(country => {
        if (country.name === countryName) {
          const generation = Number(country.net_generation?.[currentYear]);
          const consumption = Number(country.net_consumption?.[currentYear]);
          const tradeBalanceValue = country.trade_balance?.[currentYear];
          
          if (!isNaN(generation) && !isNaN(consumption)) {
            const tradeBalance = (tradeBalanceValue != null && !isNaN(Number(tradeBalanceValue))) 
              ? Number(tradeBalanceValue) 
              : null;
            
            comparisonData.push({
              country: country.name,
              generation: generation,
              consumption: consumption,
              tradeBalance: tradeBalance,
              hasValidTradeBalance: tradeBalance !== null
            });
          }
        }
      });
    });
    
    // 발전량에 따라 정렬 (큰 것부터 작은 것까지)
    comparisonData.sort((a, b) => b.generation - a.generation);
    
    if (comparisonData.length === 0) {
      svg.attr('width', width).attr('height', height);
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .text('Select countries to compare')
        .style('font-size', '14px')
        .style('fill', '#666');
      return;
    }
    
    // SVG 크기 설정
    svg.attr('width', width).attr('height', height);
    
    // 스케일 생성 - 최대 값을 발전량 + 수입으로 조정
    let maxValue = 0;
    comparisonData.forEach(country => {
      const generationValue = country.generation;
      const importValue = country.hasValidTradeBalance && country.tradeBalance < 0 ? Math.abs(country.tradeBalance) : 0;
      const totalValue = generationValue + importValue;
      maxValue = Math.max(maxValue, country.consumption, totalValue);
    });
    maxValue += 10; // 10 TWh 버퍼 추가
    
    const yScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([chartHeight, 0]);
    
    const xScale = d3.scaleBand()
      .domain(comparisonData.map(d => d.country))
      .range([0, chartWidth])
      .padding(0.1); // Reduced padding for wider bars
    
    // 차트 그룹 생성
    const chartGroup = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // 라벨이 있는 y축 추가
    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => d >= 1000 ? `${(d/1000).toFixed(0)}k` : d);
    
    chartGroup.append('g')
      .attr('class', 'chart-y-axis')
      .call(yAxis)
      .selectAll('text')
      .style('font-size', '9px')
      .style('fill', '#666');
    
    // 그리드 라인 추가 (수평) - y축과 분리
    const gridAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickSize(-chartWidth)
      .tickFormat('');
    
    chartGroup.append('g')
      .attr('class', 'chart-grid')
      .call(gridAxis);
    
    // 각 국가에 대한 막대 그리기
    comparisonData.forEach((country, i) => {
      const xPos = xScale(country.country);
      const barWidth = xScale.bandwidth();
      
      // 발전량 막대 (파란색) - 왼쪽 절반, 더 가까움
      const generationHeight = chartHeight - yScale(country.generation);
      chartGroup.append('rect')
        .attr('class', 'generation-bar')
        .attr('x', xPos + barWidth * 0.1)
        .attr('y', yScale(country.generation))
        .attr('width', barWidth * 0.38)
        .attr('height', generationHeight)
        .attr('fill', '#2196F3')
        .attr('fill-opacity', 0.8)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this).classed('highlighted', true);
          showComparisonTooltip(event, country, 'generation-with-trade');
        })
        .on('mouseout', function() {
          d3.select(this).classed('highlighted', false);
          hideTooltip();
        });
      
      // 소비량 막대 (회색) - 오른쪽 절반, 더 가까움
      const consumptionHeight = chartHeight - yScale(country.consumption);
      chartGroup.append('rect')
        .attr('class', 'consumption-bar')
        .attr('x', xPos + barWidth * 0.52)
        .attr('y', yScale(country.consumption))
        .attr('width', barWidth * 0.38)
        .attr('height', consumptionHeight)
        .attr('fill', '#999')
        .attr('fill-opacity', 0.8)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this).classed('highlighted', true);
          showComparisonTooltip(event, country, 'consumption');
        })
        .on('mouseout', function() {
          d3.select(this).classed('highlighted', false);
          hideTooltip();
        });
      
      // 수출과 수입 거래 잔액 박스 (유효한 수출과 수입 거래 잔액이 있고 0이 아닌 경우에만)
      if (country.hasValidTradeBalance && Math.abs(country.tradeBalance) > 0.01) {
        const tradeBalance = country.tradeBalance;
        const tradeAmount = Math.abs(tradeBalance);
        const boxHeight = Math.abs(yScale(0) - yScale(tradeAmount));
        const generationTop = yScale(country.generation);
        const boxX = xPos + barWidth * 0.1;
        const boxWidth = barWidth * 0.38;
        
        // 수입 (음수 수출과 수입 거래 잔액): 강한 주황색, 발전량 막대 위
        // 수출 (양수 수출과 수입 거래 잔액): 파란색, 발전량 막대 아래
        const isImport = tradeBalance < 0;
        const boxColor = isImport ? '#ff5722' : '#00897b';
        const boxY = isImport ? generationTop - boxHeight : generationTop;
        
        // 수출과 수입 거래 잔액 금액에 대한 대시 사각형
        chartGroup.append('rect')
          .attr('class', 'trade-balance-box')
          .attr('x', boxX)
          .attr('y', boxY)
          .attr('width', boxWidth)
          .attr('height', boxHeight)
          .attr('fill', boxColor)
          .attr('fill-opacity', 0.5)
          .attr('stroke', boxColor)
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3')
          .style('cursor', 'pointer')
          .on('mouseover', function(event, d) {
            d3.select(this).attr('stroke-width', 2);
            showComparisonTooltip(event, country, 'trade');
          })
          .on('mouseout', function() {
            d3.select(this).attr('stroke-width', 1);
            hideTooltip();
          });
        
        // 수출과 수입 거래 잔액 박스의 전체 높이를 넘는 화살표
        const arrowX = boxX + boxWidth / 2;
        const arrowStartY = isImport ? boxY + boxHeight : boxY;
        const arrowEndY = isImport ? boxY : boxY + boxHeight;
        
        // 박스 높이에 따라 화살표 머리 크기 조정
        const headSize = Math.min(5, boxHeight * 0.4);
        
        // 화살표 줄 - 전체 높이
        chartGroup.append('line')
          .attr('class', 'trade-arrow-shaft')
          .attr('x1', arrowX)
          .attr('y1', arrowStartY)
          .attr('x2', arrowX)
          .attr('y2', arrowEndY)
          .attr('stroke', boxColor)
          .attr('stroke-width', 3)
          .style('cursor', 'pointer')
          .on('mouseover', function(event, d) {
            d3.select(this).attr('stroke-width', 5);
            showComparisonTooltip(event, country, 'trade');
          })
          .on('mouseout', function() {
            d3.select(this).attr('stroke-width', 3);
            hideTooltip();
          });
        
        // 방향 끝에 있는 화살표 머리
        if (headSize > 1) { // 충분히 클 경우에는 화살표 머리 그리기
          const arrowHeadY = isImport ? boxY : boxY + boxHeight;
          const arrowHeadPoints = isImport
            ? `${arrowX},${arrowHeadY} ${arrowX - headSize},${arrowHeadY + headSize} ${arrowX + headSize},${arrowHeadY + headSize}`
            : `${arrowX},${arrowHeadY} ${arrowX - headSize},${arrowHeadY - headSize} ${arrowX + headSize},${arrowHeadY - headSize}`;
          
          chartGroup.append('polygon')
            .attr('class', 'trade-arrow-head')
            .attr('points', arrowHeadPoints)
            .attr('fill', boxColor)
            .style('cursor', 'pointer')
            .on('mouseover', function(event, d) {
              d3.select(this).attr('fill-opacity', 0.8);
              showComparisonTooltip(event, country, 'trade');
            })
            .on('mouseout', function() {
              d3.select(this).attr('fill-opacity', 1);
              hideTooltip();
            });
        }
      }
    });
    
    // 국가명과 선택 버튼이 있는 x축 추가
    chartGroup.append('g')
      .attr('class', 'chart-axis')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('font-size', comparisonData.length > 20 ? '7px' : '10px')
      .style('fill', d => {
        const isSelected = selectedCountries.includes(d);
        return isSelected ? '#2196F3' : '#333';
      })
      .style('font-weight', d => {
        const isSelected = selectedCountries.includes(d);
        return isSelected ? '600' : 'normal';
      })
      .attr('transform', 'rotate(-35)')
      .style('text-anchor', 'end')
      .attr('dy', '0.7em');
    
    // y축 라벨 추가
    chartGroup.append('text')
      .attr('class', 'chart-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .text('Electricity (TWh)');
    
    // 제목 추가
    chartGroup.append('text')
      .attr('class', 'chart-title')
      .attr('x', chartWidth / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .text(`Country Comparison (${comparisonData.length} selected)`);

    // 비교 차트에 대한 툴팁 함수
    function showComparisonTooltip(event, country, type) {
      if (!tooltipRef.current) return;
      
      const tooltip = d3.select(tooltipRef.current);
      let content = `<div><strong>${country.country}</strong></div>`;
      
      if (type === 'generation') {
        content += `<div>Generation: ${country.generation.toFixed(1)} TWh</div>`;
      } else if (type === 'generation-with-trade') {
        content += `<div>Generation: ${country.generation.toFixed(1)} TWh</div>`;
        if (country.hasValidTradeBalance && Math.abs(country.tradeBalance) > 0.01) {
          const tradeType = country.tradeBalance > 0 ? 'Net Exports' : 'Net Imports';
          content += `<div>${tradeType}: ${Math.abs(country.tradeBalance).toFixed(1)} TWh</div>`;
          content += `<div>Trade Balance: ${country.tradeBalance.toFixed(1)} TWh</div>`;
        } else {
          content += `<div>Trade Balance: Data not available</div>`;
        }
      } else if (type === 'consumption') {
        content += `<div>Consumption: ${country.consumption.toFixed(1)} TWh</div>`;
      } else if (type === 'trade') {
        if (country.hasValidTradeBalance) {
          const tradeType = country.tradeBalance > 0 ? 'Net Exports' : 'Net Imports';
          content += `<div>${tradeType}: ${Math.abs(country.tradeBalance).toFixed(1)} TWh</div>`;
          content += `<div>Trade Balance: ${country.tradeBalance.toFixed(1)} TWh</div>`;
        } else {
          content += `<div>Trade Balance: Data not available</div>`;
        }
      }
      
      tooltip.style('opacity', 1)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .html(content);
    }
    
    function hideTooltip() {
      if (tooltipRef.current) {
        d3.select(tooltipRef.current).style('opacity', 0);
      }
          }
        
  }, [currentYear, selectedCountries, countriesData, tooltipRef]); // eslint-disable-line react-hooks/exhaustive-deps

  // Draw global trend chart
  const drawTrendChart = useCallback(() => {
    if (!trendChartRef.current) return;
    
    const svg = d3.select(trendChartRef.current);
    const container = svg.node().parentElement;
    
    if (!container) return;
    
    // 크기 설정
    const containerWidth = container.clientWidth || 800;
    const containerHeight = container.clientHeight || 350;
    const width = containerWidth;
    const height = containerHeight;
    
    svg.selectAll("*").remove();
    
    const margin = { top: 50, right: 120, bottom: 60, left: 80 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // 각 연도에 대한 전역 총계 계산
    const years = [];
    for (let year = 1990; year <= 2023; year++) {
      years.push(year);
    }
    
    const trendData = years.map(year => {
      let totalGeneration = 0;
      let totalConsumption = 0;
      let totalTrade = 0; // absolute sum of all trade (imports + exports)
      
      Object.values(countriesData).forEach(country => {
        const generation = Number(country.net_generation?.[year]);
        const consumption = Number(country.net_consumption?.[year]);
        const tradeBalance = Number(country.trade_balance?.[year]);
        
        if (!isNaN(generation)) totalGeneration += generation;
        if (!isNaN(consumption)) totalConsumption += consumption;
        if (!isNaN(tradeBalance)) totalTrade += Math.abs(tradeBalance);
      });
      
      return {
        year,
        generation: totalGeneration,
        consumption: totalConsumption,
        trade: totalTrade
      };
    });
    
    // SVG 크기 설정
    svg.attr('width', width).attr('height', height);
    
    // 스케일 생성
    const xScale = d3.scaleLinear()
      .domain(d3.extent(years))
      .range([0, chartWidth]);
    
    const maxValue = d3.max(trendData, d => Math.max(d.generation, d.consumption, d.trade));
    const yScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([chartHeight, 0]);
    
    // 차트 그룹 생성
    const chartGroup = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // 그리드 라인 추가
    const yAxis = d3.axisLeft(yScale)
      .ticks(6)
      .tickSize(-chartWidth)
      .tickFormat(d => d >= 1000 ? `${(d/1000).toFixed(0)}k` : d);
    
    chartGroup.append('g')
      .attr('class', 'chart-grid')
      .call(yAxis)
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', '#666');
    
    // 그리드 라인 라벨 제거 (그리드 라인만 유지)
    chartGroup.select('.chart-grid')
      .selectAll('text').remove();
    
    // 라벨이 있는 y축 추가
    const yAxisLabels = d3.axisLeft(yScale)
      .ticks(6)
      .tickSize(0)
      .tickFormat(d => d >= 1000 ? `${(d/1000).toFixed(0)}k` : d);
    
    chartGroup.append('g')
      .attr('class', 'chart-y-axis')
      .call(yAxisLabels)
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', '#666');
    
    // x축 추가
    const xAxis = d3.axisBottom(xScale)
      .ticks(8)
      .tickFormat(d => d.toString());
    
    chartGroup.append('g')
      .attr('class', 'chart-x-axis')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', '#666');
    
    // 선 생성기 생성
    const lineGeneration = d3.line()
      .x(d => xScale(d.year))
      .y(d => yScale(d.generation))
      .curve(d3.curveMonotoneX);
    
    const lineConsumption = d3.line()
      .x(d => xScale(d.year))
      .y(d => yScale(d.consumption))
      .curve(d3.curveMonotoneX);
    
    const lineTrade = d3.line()
      .x(d => xScale(d.year))
      .y(d => yScale(d.trade))
      .curve(d3.curveMonotoneX);
    
    // 선 그리기
    chartGroup.append('path')
      .datum(trendData)
      .attr('class', 'trend-line-generation')
      .attr('d', lineGeneration)
      .attr('fill', 'none')
      .attr('stroke', '#2196F3')
      .attr('stroke-width', 3)
      .attr('stroke-opacity', 0.8);
    
    chartGroup.append('path')
      .datum(trendData)
      .attr('class', 'trend-line-consumption')
      .attr('d', lineConsumption)
      .attr('fill', 'none')
      .attr('stroke', '#999')
      .attr('stroke-width', 3)
      .attr('stroke-opacity', 0.8);
    
    chartGroup.append('path')
      .datum(trendData)
      .attr('class', 'trend-line-trade')
      .attr('d', lineTrade)
      .attr('fill', 'none')
      .attr('stroke', '#ab47bc')
      .attr('stroke-width', 3)
      .attr('stroke-opacity', 0.8);
    
    // 데이터 포인트에 대한 점 추가 (항상 보이게)
    const colors = ['#2196F3', '#999', '#ab47bc'];
    ['generation', 'consumption', 'trade'].forEach((metric, index) => {
      chartGroup.selectAll(`.dot-${metric}`)
        .data(trendData)
        .join('circle')
        .attr('class', `dot-${metric}`)
        .attr('cx', d => xScale(d.year))
        .attr('cy', d => yScale(d[metric]))
        .attr('r', 3)
        .attr('fill', colors[index])
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .style('opacity', 1);
    });

    // 마우스 상호작용을 위한 투명 오버레이 추가
    const overlay = chartGroup.append('rect')
      .attr('class', 'chart-overlay')
      .attr('width', chartWidth)
      .attr('height', chartHeight)
      .style('fill', 'none')
      .style('pointer-events', 'all')
      .style('cursor', 'crosshair');

    // hover를 위한 수직선 추가
    const hoverLine = chartGroup.append('line')
      .attr('class', 'hover-line')
      .attr('y1', 0)
      .attr('y2', chartHeight)
      .attr('stroke', '#666')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .style('opacity', 0);

    // 마우스 상호작용
    overlay
      .on('mousemove', function(event) {
        const [mouseX] = d3.pointer(event, this);
        const year = Math.round(xScale.invert(mouseX));
        
        // 가장 가까운 데이터 포인트 찾기
        const closestData = trendData.find(d => d.year === year) || 
                           trendData.reduce((prev, curr) => 
                             Math.abs(curr.year - year) < Math.abs(prev.year - year) ? curr : prev);
        
        if (closestData) {
          const x = xScale(closestData.year);
          
          // hover 라인 위치 업데이트
          hoverLine
            .attr('x1', x)
            .attr('x2', x)
            .style('opacity', 1);
          
          // hover 위치에 있는 점 강조
          ['generation', 'consumption', 'trade'].forEach(metric => {
            chartGroup.selectAll(`.dot-${metric}`)
              .attr('r', d => d.year === closestData.year ? 5 : 3)
              .attr('stroke-width', d => d.year === closestData.year ? 2 : 1);
          });
          
          // 모든 값을 표시하는 툴팁 표시
          showAllValuesTooltip(event, closestData);
        }
      })
      .on('mouseout', function() {
        hoverLine.style('opacity', 0);
        // 모든 점을 기본 크기로 재설정
        chartGroup.selectAll('[class^="dot-"]')
          .attr('r', 3)
          .attr('stroke-width', 1);
        hideTooltip();
      });
    
    // 현재 연도 선 추가
    chartGroup.append('line')
      .attr('class', 'current-year-line')
      .attr('x1', xScale(currentYear))
      .attr('x2', xScale(currentYear))
      .attr('y1', 0)
      .attr('y2', chartHeight)
      .attr('stroke', '#ff4444')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('opacity', 0.7);
    
    // 차트 제목 추가
    svg.append('text')
      .attr('class', 'chart-title')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .text('Global Electricity Trends (1990-2023)');
    
    // y축 라벨 추가
    chartGroup.append('text')
      .attr('class', 'chart-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .text('Electricity (TWh)');
    
    // x축 라벨 추가
    chartGroup.append('text')
      .attr('class', 'chart-axis-label')
      .attr('x', chartWidth / 2)
      .attr('y', chartHeight + 45)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .text('Year');
    
    // 범례 추가
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 110}, 60)`);
    
    const legendData = [
      { label: 'Generation', color: '#2196F3' },
      { label: 'Consumption', color: '#999' },
      { label: 'Total Trade', color: '#ab47bc' }
    ];
    
    legendData.forEach((item, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);
      
      legendItem.append('line')
        .attr('x1', 0)
        .attr('x2', 15)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', item.color)
        .attr('stroke-width', 3);
      
      legendItem.append('circle')
        .attr('cx', 7.5)
        .attr('cy', 0)
        .attr('r', 3)
        .attr('fill', item.color)
        .attr('stroke', 'white')
        .attr('stroke-width', 1);
      
      legendItem.append('text')
        .attr('x', 20)
        .attr('y', 4)
        .style('font-size', '10px')
        .style('fill', '#333')
        .text(item.label);
    });

    // 툴팁 함수
    function showAllValuesTooltip(event, data) {
      if (!tooltipRef.current) return;
      
      const tooltip = d3.select(tooltipRef.current);
      
      let content = `<div style="font-weight: 600; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px;">${data.year}</div>`;
      content += `<div style="display: flex; align-items: center; margin-bottom: 4px;">`;
      content += `<div style="width: 10px; height: 10px; background: #2196F3; margin-right: 6px; border-radius: 50%;"></div>`;
      content += `Generation: <strong>${data.generation.toLocaleString()} TWh</strong></div>`;
      content += `<div style="display: flex; align-items: center; margin-bottom: 4px;">`;
      content += `<div style="width: 10px; height: 10px; background: #999; margin-right: 6px; border-radius: 50%;"></div>`;
      content += `Consumption: <strong>${data.consumption.toLocaleString()} TWh</strong></div>`;
      content += `<div style="display: flex; align-items: center;">`;
      content += `<div style="width: 10px; height: 10px; background: #ab47bc; margin-right: 6px; border-radius: 50%;"></div>`;
      content += `Total Trade: <strong>${data.trade.toLocaleString()} TWh</strong></div>`;
      
      tooltip.style('opacity', 1)
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .html(content);
    }
    
    function hideTooltip() {
      if (tooltipRef.current) {
        d3.select(tooltipRef.current).style('opacity', 0);
      }
    }
      
  }, [currentYear, countriesData, tooltipRef]);

  // 비교 차트 초기화
  useEffect(() => {
    const timer = setTimeout(() => {
      if (comparisonChartRef.current) {
        drawComparisonChart();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [drawComparisonChart]);

  // 추세 차트 초기화
  useEffect(() => {
    const timer = setTimeout(() => {
      if (trendChartRef.current) {
        drawTrendChart();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [currentYear]); // eslint-disable-line react-hooks/exhaustive-deps

  // 국가 선택 토글
  const toggleCountrySelection = useCallback((countryName) => {
    setSelectedCountries(prev => {
      if (prev.includes(countryName)) {
        // 이미 선택되었을 때 제거
        return prev.filter(name => name !== countryName);
      } else {
        // 선택되지 않았을 때 추가 (현재 제한 없음)
        return [...prev, countryName];
      }
    });
  }, []);

  // 드래그 모드 종료 - 이제 즉시 refs 업데이트
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    isDraggingRef.current = false;
    dragModeRef.current = 'select';
  }, []);

  // 드래그 종료에 대한 전역 마우스 업 리스너 추가 - 개선됨
  useEffect(() => {
    const handleGlobalMouseUp = (event) => {
      if (isDraggingRef.current) {
        handleDragEnd();
      }
    };

    // 즉시 처리를 위해 캡처 단계 사용
    document.addEventListener('mouseup', handleGlobalMouseUp, true);
    document.addEventListener('touchend', handleGlobalMouseUp, true);

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp, true);
      document.removeEventListener('touchend', handleGlobalMouseUp, true);
    };
  }, [handleDragEnd]);

  // 차트에 대한 window 크기 조절 핸들러
  useEffect(() => {
    const handleResize = () => {
      const timer = setTimeout(() => {
        if (horizontalChartRef.current) {
          drawHorizontalChart();
        }
        if (comparisonChartRef.current) {
          drawComparisonChart();
        }
        if (trendChartRef.current) {
          drawTrendChart();
        }
      }, 100);
      return () => clearTimeout(timer);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawHorizontalChart, drawComparisonChart, drawTrendChart]);

  return (
    <div id="world-view" className="view-container">
      <div id="upper-left-panel">
        <div className="map-wrapper">
          <div id="map-section">
            <svg ref={mapRef} id="map"></svg>
          </div>
        </div>
      </div>
      
      <div id="upper-right-panel">
        <div style={{ padding: '10px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '15px', textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#333' }}>
              Country Comparison
            </h4>
            {selectedCountries.length > 0 && (
              <>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px' }}>
                  선택된 국가들의 비교 차트
                </div>
                <button 
                  onClick={() => setSelectedCountries([])}
                  style={{
                    fontSize: '10px',
                    padding: '4px 8px',
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  전체 선택 해제 ({selectedCountries.length})
                </button>
              </>
            )}
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            {selectedCountries.length === 0 ? (
              <div style={{ height: '85%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.6', maxWidth: '300px' }}>
                  <div style={{ marginBottom: '12px', fontWeight: '500', fontSize: '18px' }}>📊 사용 방법</div>
                  <div style={{ marginBottom: '8px' }}>• 막대 그래프에서 국가명을 클릭하여 비교할 국가 선택</div>
                  <div style={{ marginBottom: '8px' }}>• 여러 국가를 드래그하여 한 번에 선택/해제 가능</div>
                  <div style={{ marginBottom: '8px' }}>• 마우스 커서를 차트 위에 올려서 정확한 데이터 확인</div>
                </div>
              </div>
            ) : (
              <svg ref={comparisonChartRef} style={{ width: '100%', height: '100%' }}></svg>
            )}
          </div>
        </div>
      </div>
      
      <div id="middle-panel">
        <div id="horizontal-chart-container">
          <div className="chart-wrapper">
            <svg ref={horizontalChartRef} id="horizontal-chart"></svg>
          </div>
        </div>
      </div>
      
      <div id="bottom-panel">
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <svg ref={trendChartRef} style={{ width: '100%', height: '100%' }}></svg>
        </div>
      </div>
    </div>
  );
};

export default World;