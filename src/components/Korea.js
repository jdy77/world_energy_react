import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import InfoPopup from './PopupBackup';
import PopupEnergyBudget from './PopupEnergyBudget';
import '../css/korea.css';

const Korea = ({ 
  currentYear,
  setCurrentYear,
  world,
  countriesData,
  southKoreaEnergyProperty,
  energyPrice,
  energyMixPercentages,
  setEnergyMixPercentages,
  neededEnergy,
  setNeededEnergy,
  showInfoPopup,
  setShowInfoPopup,
  showBudgetInfoPopup,
  setShowBudgetInfoPopup,
  tooltipRef
}) => {
  const koreaSmallMapRef = useRef();
  const koreaPieChartRef = useRef();
  const koreaLineChartRef = useRef();
  const koreaStackedChartRef = useRef();
  const neededEnergyPieRef = useRef();

  // info 아이콘 클릭 상태 추적
  const [infoIconsClicked, setInfoIconsClicked] = useState({
    energyChanges: false,
    energyBudget: false
  });

  // 고정된 슬라이더 상태 추가
  const [fixedSliders, setFixedSliders] = useState({
    fossil: false,
    nuclear: false,
    renewable: false,
    hydro: false
  });

  // stacked bar 차트에서 선택된 에너지 소스 추적
  const [selectedEnergySource, setSelectedEnergySource] = useState(null);

  // info 아이콘 클릭 핸들러
  const handleInfoIconClick = (iconType, showPopupFunc) => {
    // 이 아이콘을 클릭했다고 표시
    setInfoIconsClicked(prev => ({
      ...prev,
      [iconType]: true
    }));
    
    // popup 표시
    showPopupFunc(true);
  };

  // 팝업이 열릴 때 메인 윈도우 스크롤 방지
  useEffect(() => {
    if (showInfoPopup || showBudgetInfoPopup) {
      // 팝업이 열렸을 때 body 스크롤 방지
      document.body.style.overflow = 'hidden';
    } else {
      // 팝업이 닫혔을 때 body 스크롤 복원
      document.body.style.overflow = 'unset';
    }

    // 컴포넌트 언마운트 시 스크롤 복원
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showInfoPopup, showBudgetInfoPopup]);

  // 데이터 변환 함수 - NaN을 0으로 처리
  const convertPropertyData = useCallback(() => {
    return Object.entries(southKoreaEnergyProperty).map(([year, data]) => ({
      시점: parseInt(year),
      화석연료: data.화력 || 0,
      원자력: data.원자력 || 0,
      신재생에너지: data['신재생 및 기타'] === 'NaN' ? 0 : (data['신재생 및 기타'] || 0),
      수력: data.수력 || 0
    }));
  }, [southKoreaEnergyProperty]);

  // 변환된 데이터 사용
  const convertedPropertyData = convertPropertyData();

  // Korea 시각화 효과
  useEffect(() => {
    drawKoreaSmallMap();
    drawKoreaPieChart();
    drawKoreaLineChart();
    drawKoreaStackedChart();
  }, [currentYear, selectedEnergySource]); // eslint-disable-line react-hooks/exhaustive-deps

  // Needed Energy Pie Chart - 실시간 업데이트
  useEffect(() => {
    updateNeededEnergyPie();
  }, [energyMixPercentages]); // eslint-disable-line react-hooks/exhaustive-deps

  const drawKoreaSmallMap = () => {
    if (!koreaSmallMapRef.current) return;
    
    const svg = d3.select(koreaSmallMapRef.current);
    svg.selectAll("*").remove();
    
    const viewBoxWidth = 200;
    const viewBoxHeight = 120;
    
    svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
       .attr('preserveAspectRatio', 'xMidYMid meet')
       .style('width', '100%')
       .style('height', '100%');
    
    const width = viewBoxWidth;
    const height = viewBoxHeight;
    
    const projection = d3.geoMercator()
      .center([128, 36])
      .scale(Math.min(width, height) * 1)
      .translate([width/2, height/2]);
      
    const path = d3.geoPath(projection);
    const land = feature(world, world.objects.countries);
    
    svg.append('g')
      .selectAll('path')
      .data(land.features)
      .join('path')
      .attr('d', path)
      .attr('fill', '#eee')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 0.3);
    
    svg.append('g')
      .selectAll('path')
      .data(land.features.filter(d => d.properties.name === 'South Korea'))
      .join('path')
      .attr('d', path)
      .attr('fill', '#2196F3')
      .attr('stroke', '#1976D2')
      .attr('stroke-width', 1);
  };

  const drawKoreaPieChart = () => {
    if (!koreaPieChartRef.current) return;
    
    const svg = d3.select(koreaPieChartRef.current);
    svg.selectAll("*").remove();
    
    // 새로운 데이터 구조 사용 - 순서 변경
    const yearData = convertedPropertyData.find(d => d.시점 === currentYear);
    if (!yearData) return;
    
    const data = [
      { name: '화석연료', value: yearData.화석연료, color: '#ff7f0e' },
      { name: '원자력', value: yearData.원자력, color: '#1f77b4' },
      { name: '신재생에너지', value: yearData.신재생에너지, color: '#2ca02c' },
      { name: '수력', value: yearData.수력, color: '#17a2b8' }
    ];
    
    const total = data.reduce((sum, d) => sum + d.value, 0);
    
    const viewBoxWidth = 200;
    const viewBoxHeight = 200;
    const width = viewBoxWidth;
    const height = viewBoxHeight;
    const radius = Math.min(width, height) / 2 - 10;
    
    svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
       .attr('preserveAspectRatio', 'xMidYMid meet')
       .style('width', '100%')
       .style('height', '100%');
    
    const g = svg.append('g')
      .attr('transform', `translate(${width/2}, ${height/2})`);
    
    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);
    
    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);
    
    const arcs = g.selectAll('.arc')
      .data(pie(data))
      .enter().append('g')
      .attr('class', 'arc');
    
    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        const percent = ((d.data.value / total) * 100).toFixed(1);
        const originalValue = southKoreaEnergyProperty[currentYear]?.[
          d.data.name === '신재생에너지' ? '신재생 및 기타' : 
          d.data.name === '화석연료' ? '화력' : d.data.name
        ];
        
        if (tooltipRef.current) {
          const tooltip = d3.select(tooltipRef.current);
          tooltip.style('opacity', 1)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .html(`
              <div><strong>${d.data.name}</strong></div>
              <div>비율: ${percent}%</div>
              <div>실제값: ${originalValue === 'NaN' ? 'NaN' : (d.data.value / 1000).toFixed(1)} TWh</div>
            `);
        }
      })
      .on('mouseout', () => {
        if (tooltipRef.current) {
          d3.select(tooltipRef.current).style('opacity', 0);
        }
      });
    
    arcs.append('text')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', 'white')
      .style('font-weight', 'bold')
      .text(d => {
        const percent = ((d.data.value / total) * 100);
        return percent >= 10 ? `${percent.toFixed(1)}%` : '';
      });
  };

  // South Korea 데이터를 countriesData에서 추출
  const getSouthKoreaData = useCallback(() => {
    const southKoreaCountry = Object.values(countriesData).find(country => 
      country.name === 'South Korea'
    );
    return southKoreaCountry;
  }, [countriesData]);

  const drawKoreaLineChart = () => {
    if (!koreaLineChartRef.current || !countriesData) return;
    
    const svg = d3.select(koreaLineChartRef.current);
    svg.selectAll("*").remove();
    
    const viewBoxWidth = 600;
    const viewBoxHeight = 380; // Further increased height to accommodate current year labels
    const margin = { top: 15, right: 70, bottom: 115, left: 50 }; // Further increased bottom margin
    const width = viewBoxWidth - margin.left - margin.right;
    const height = viewBoxHeight - margin.top - margin.bottom;
    
    svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
       .attr('preserveAspectRatio', 'xMidYMid meet')
       .style('width', '100%')
       .style('height', '100%');
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // World.js 데이터에서 South Korea 부분 사용
    const southKoreaData = getSouthKoreaData();
    if (!southKoreaData) return;
    
    // 연도별 데이터 추출
    const years = Object.keys(southKoreaData.net_generation || {}).map(Number).sort();
    
    const lineData = {
      production: years.map(year => ({ 
        year: year, 
        value: southKoreaData.net_generation?.[year] || 0 
      })),
      imports: years.map(year => ({ 
        year: year, 
        value: southKoreaData.imports?.[year] || 0 
      })),
      consumption: years.map(year => ({ 
        year: year, 
        value: southKoreaData.net_consumption?.[year] || 0 
      }))
    };
    
    const xScale = d3.scaleLinear()
      .domain(d3.extent(years))
      .range([0, width]);
    
    const maxValue = d3.max([
      d3.max(lineData.production, d => d.value),
      d3.max(lineData.imports, d => d.value),
      d3.max(lineData.consumption, d => d.value)
    ]);
    
    const yScale = d3.scaleLinear()
      .domain([0, maxValue])
      .nice()
      .range([height, 0]);
    
    const line = d3.line()
      .x(d => xScale(d.year))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);
    
    // 축 그리기
    g.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format('d')))
      .selectAll('text')
      .style('font-size', '10px');
    
    g.append('g')
      .call(d3.axisLeft(yScale).tickFormat(d3.format('.0s')))
      .selectAll('text')
      .style('font-size', '10px');
    
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left + 15)
      .attr('x', 0 - (height / 2))
      .style('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', '#666')
      .text('Energy (TWh)');
    
    const colors = { production: '#2196F3', imports: '#e53e3e', consumption: '#666' };
    const labels = { production: '생산', imports: '수입', consumption: '소비' };
    
    // 선 그리기
    Object.keys(lineData).forEach(key => {
      g.append('path')
        .datum(lineData[key])
        .attr('fill', 'none')
        .attr('stroke', colors[key])
        .attr('stroke-width', 2)
        .attr('d', line);
    });
    
    // 범례 - 생산, 소비, 수입
    const legend = svg.append('g')
      .attr('transform', `translate(${viewBoxWidth - margin.right + 5}, ${margin.top + 5})`);
    
    const legendOrder = ['production', 'consumption', 'imports'];
    
    legendOrder.forEach((key, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);
      
      legendItem.append('line')
        .attr('x1', 0)
        .attr('x2', 18)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', colors[key])
        .attr('stroke-width', 3);
      
      legendItem.append('text')
        .attr('x', 22)
        .attr('y', 4)
        .style('font-size', '11px')
        .style('fill', '#333')
        .text(labels[key]);
    });

    // hover 상호작용 추가
    const overlay = g.append('rect')
      .attr('class', 'overlay')
      .attr('width', width)
      .attr('height', height)
      .style('fill', 'none')
      .style('pointer-events', 'all');
    
          const focus = g.append('g')
        .attr('class', 'focus')
        .style('display', 'none');
      
      focus.append('line')
        .attr('class', 'x-hover-line hover-line')
        .attr('y1', 0)
        .attr('y2', height)
        .style('stroke', '#666')
        .style('stroke-width', 1)
        .style('stroke-dasharray', '3,3')
        .style('opacity', 0.8);
      
      Object.keys(lineData).forEach((key) => {
        focus.append('circle')
          .attr('class', `circle-${key}`)
          .attr('r', 4)
          .style('fill', colors[key])
          .style('stroke', 'white')
          .style('stroke-width', 2);
        
        // Add background rectangle for text readability
        focus.append('rect')
          .attr('class', `text-bg-${key}`)
          .style('fill', 'rgba(255, 255, 255, 0.8)')
          .style('stroke', 'none')
          .attr('rx', 2);
        
        focus.append('text')
          .attr('class', `text-${key}`)
          .style('font-size', '11px')
          .style('font-weight', '600')
          .style('fill', colors[key])
          .style('text-anchor', 'middle');
      });
    
    const yearText = focus.append('text')
      .attr('class', 'year-text')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .style('text-anchor', 'middle')
      .attr('y', height + 35); 
    
    const mousemove = function(event) {
      const [mouseX] = d3.pointer(event);
      const x0 = xScale.invert(mouseX);
      
      const bisect = d3.bisector(d => d.year).left;
      const i = bisect(lineData.production, x0, 1);
      const d0 = lineData.production[i - 1];
      const d1 = lineData.production[i];
      
      if (!d0 || !d1) return;
      
      const selectedData = x0 - d0.year > d1.year - x0 ? d1 : d0;
      const selectedYear = selectedData.year;
      
      focus.select('.x-hover-line')
        .attr('x1', xScale(selectedYear))
        .attr('x2', xScale(selectedYear));
      
      yearText
        .attr('x', xScale(selectedYear))
        .text(selectedYear);
      
      // 선택된 연도의 모든 데이터 포인트를 수집하고 값에 따라 정렬
       const allDataPoints = Object.keys(lineData).map((key, index) => {
         const dataPoint = lineData[key].find(d => d.year === selectedYear);
         return dataPoint ? { key, index, ...dataPoint } : null;
       }).filter(d => d !== null).sort((a, b) => b.value - a.value);
       
       // 레이블 중복 방지를 위한 위치 계산
       const minLabelSpacing = 18;
       const positions = [];
       
       allDataPoints.forEach((dataPoint, sortedIndex) => {
         const circle = focus.select(`.circle-${dataPoint.key}`);
         const text = focus.select(`.text-${dataPoint.key}`);
         const textBg = focus.select(`.text-bg-${dataPoint.key}`);
         
         circle
           .attr('cx', xScale(dataPoint.year))
           .attr('cy', yScale(dataPoint.value));
         
         // 최적의 레이블 위치 계산
         let idealY = yScale(dataPoint.value) - 15;
         
         // 기존 레이블과의 충돌 확인
         let finalY = idealY;
         let attempts = 0;
         while (attempts < 10) {
           let hasConflict = false;
           for (let pos of positions) {
             if (Math.abs(finalY - pos) < minLabelSpacing) {
               hasConflict = true;
               break;
             }
           }
           
           if (!hasConflict) {
             break;
           }
           
           // 이상적인 위치 -위와 아래를 번갈아가며 시도
           if (attempts % 2 === 0) {
             finalY = idealY - ((attempts + 2) / 2) * minLabelSpacing;
           } else {
             finalY = idealY + ((attempts + 1) / 2) * minLabelSpacing;
           }
           attempts++;
         }
         
         // 레이블이 차트 경계 내에 유지되도록 함 (하지만 차트 콘텐츠와 겹칠 수 있음)
         finalY = Math.max(finalY, 5); // 차트 위에 가지 않음
         finalY = Math.min(finalY, height + 30); // 차트 아래로 너무 멀리 가지 않음
         
         positions.push(finalY);
         
         const textContent = `${dataPoint.value.toFixed(1)}`;
         text
           .attr('x', xScale(dataPoint.year))
           .attr('y', finalY)
           .text(textContent);
         
         // 배경 사각형의 위치와 크기 계산
         const bbox = text.node().getBBox();
         textBg
           .attr('x', bbox.x - 2)
           .attr('y', bbox.y - 1)
           .attr('width', bbox.width + 4)
           .attr('height', bbox.height + 2);
       });
      
      focus.style('display', null);
    };
    
    const mouseout = function() {
      focus.style('display', 'none');
    };
    
    overlay
      .on('mouseover', () => focus.style('display', null))
      .on('mouseout', mouseout)
      .on('mousemove', mousemove);

    // 현재 연도 표시
    if (years.includes(currentYear)) {
      // 현재 연도 수직 점선
      g.append('line')
        .attr('class', 'current-year-indicator')
        .attr('x1', xScale(currentYear))
        .attr('x2', xScale(currentYear))
        .attr('y1', 0)
        .attr('y2', height)
        .style('stroke', '#ff6b35')
        .style('stroke-width', 2)
        .style('stroke-dasharray', '4,4')
        .style('opacity', 0.8);

      // 현재 연도 값 레이블 (x축 아래)
      const currentYearData = {
        production: lineData.production.find(d => d.year === currentYear),
        imports: lineData.imports.find(d => d.year === currentYear),
        consumption: lineData.consumption.find(d => d.year === currentYear)
      };

      const labelColors = { production: '#2196F3', imports: '#e53e3e', consumption: '#666' };
      const labelTexts = { production: '생산', imports: '수입', consumption: '소비' };

      // 레이블 위치 (x축 아래)
      const labelStartY = height + 50; // x축 아래에서 시작
      const labelSpacing = 15; // 각 레이블 간의 간격

      Object.keys(currentYearData).forEach((key, index) => {
        const data = currentYearData[key];
        if (data) {
          g.append('text')
            .attr('class', 'current-year-label')
            .attr('x', xScale(currentYear))
            .attr('y', labelStartY + (index * labelSpacing))
            .style('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('fill', labelColors[key])
            .text(`${currentYear}년 ${labelTexts[key]} : ${data.value.toFixed(1)}`);
        }
      });

      // 현재 연도 원 표시
      Object.keys(currentYearData).forEach((key) => {
        const data = currentYearData[key];
        if (data) {
          g.append('circle')
            .attr('class', 'current-year-circle')
            .attr('cx', xScale(data.year))
            .attr('cy', yScale(data.value))
            .attr('r', 5)
            .style('fill', labelColors[key])
            .style('stroke', 'white')
            .style('stroke-width', 2)
            .style('opacity', 0.9);
        }
      });
    }
  };

  const drawKoreaStackedChart = () => {
    if (!koreaStackedChartRef.current) return;
    
    const svg = d3.select(koreaStackedChartRef.current);
    svg.selectAll("*").remove();
    
    const viewBoxWidth = 600;
    const viewBoxHeight = 320;
    const margin = { top: 30, right: 15, bottom: 40, left: 50 };
    const width = viewBoxWidth - margin.left - margin.right;
    const height = viewBoxHeight - margin.top - margin.bottom;
    
    svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
       .attr('preserveAspectRatio', 'xMidYMid meet')
       .style('width', '100%')
       .style('height', '100%');
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // 변환된 데이터 사용 - 순서 변경, 기타 제거
    const allData = convertedPropertyData;
    const baseKeys = ['화석연료', '원자력', '신재생에너지', '수력'];
    const baseColors = ['#ff7f0e', '#1f77b4', '#2ca02c', '#17a2b8'];
    
    // 선택된 에너지 소스가 있으면 순서를 재배열 (선택된 것이 맨 아래)
    let keys, colors;
    if (selectedEnergySource) {
      const selectedIndex = baseKeys.indexOf(selectedEnergySource);
      if (selectedIndex !== -1) {
        keys = [selectedEnergySource, ...baseKeys.filter(k => k !== selectedEnergySource)];
        colors = [baseColors[selectedIndex], ...baseColors.filter((c, i) => i !== selectedIndex)];
      } else {
        keys = baseKeys;
        colors = baseColors;
      }
    } else {
      keys = baseKeys;
      colors = baseColors;
    }
    
    const stack = d3.stack().keys(keys);
    const stackedData = stack(allData);
    
    const xScale = d3.scaleBand()
      .domain(allData.map(d => d.시점))
      .range([0, width])
      .padding(0.08);
    
    const maxTotal = d3.max(allData, d => d.화석연료 + d.원자력 + d.신재생에너지 + d.수력);
    
    const yScale = d3.scaleLinear()
      .domain([0, maxTotal])
      .nice()
      .range([height, 0]);
    
    const colorScale = d3.scaleOrdinal()
      .domain(keys)
      .range(colors);
    
    // 데이터 바들 먼저 그리기
    g.append('g')
      .attr('class', 'data-rects')
      .selectAll('g')
      .data(stackedData)
      .join('g')
      .attr('fill', d => colorScale(d.key))
      .attr('fill-opacity', d => {
        // 선택된 에너지 소스가 있으면 다른 소스들은 투명하게
        if (selectedEnergySource && d.key !== selectedEnergySource) {
          return 0.3;
        }
        return 1;
      })
      .selectAll('rect')
      .data(d => d)
      .join('rect')
      .attr('x', d => xScale(d.data.시점))
      .attr('y', d => yScale(d[1]))
      .attr('height', d => yScale(d[0]) - yScale(d[1]))
      .attr('width', xScale.bandwidth())
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        const year = d.data.시점;
        const yearData = allData.find(item => item.시점 === year);
        const originalData = southKoreaEnergyProperty[year];
        
        // 데이터 바들만 연하게 (범례 제외)
        g.selectAll('.data-rects rect')
          .style('opacity', function() {
            const rectData = d3.select(this).datum();
            return rectData && rectData.data && rectData.data.시점 === year ? 1 : 0.3;
          });
        
        if (tooltipRef.current && yearData && originalData) {
          const tooltip = d3.select(tooltipRef.current);
          tooltip.style('opacity', 1)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .html(`
              <div><strong>${year}년 (단위: TWh)</strong></div>
              <div>화석연료: ${originalData.화력 ? (originalData.화력 / 1000).toFixed(1) : 'N/A'}</div>
              <div>원자력: ${originalData.원자력 ? (originalData.원자력 / 1000).toFixed(1) : 'N/A'}</div>
              <div>신재생에너지: ${originalData['신재생 및 기타'] === 'NaN' ? 'NaN' : (originalData['신재생 및 기타'] ? (originalData['신재생 및 기타'] / 1000).toFixed(1) : 'N/A')}</div>
              <div>수력: ${originalData.수력 ? (originalData.수력 / 1000).toFixed(1) : 'N/A'}</div>
              <div><strong>총합: ${originalData.합계 ? (originalData.합계 / 1000).toFixed(1) : 'N/A'}</strong></div>
            `);
        }
      })
      .on('mouseout', () => {
        // 데이터 바들만 원래대로 복원
        g.selectAll('.data-rects rect').style('opacity', 1);
        
        if (tooltipRef.current) {
          d3.select(tooltipRef.current).style('opacity', 0);
        }
      })
      .on('click', function(event, d) {
        const year = d.data.시점;
        setCurrentYear(year);
      });
    
    g.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(xScale)
        .tickValues(allData.map(d => d.시점).filter((d, i) => i % 4 === 0 || i === allData.length - 1))
        .tickFormat(d => d.toString())
      )
      .selectAll('text')
      .style('font-size', '10px');
    
    g.append('g')
      .call(d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(d => {
          const twh = d / 1000;  // GWh를 TWh로 변환
          if (twh >= 1000) return (twh / 1000).toFixed(0) + 'P';
          if (twh >= 1) return twh.toFixed(0);
          return (twh * 1000).toFixed(0) + 'G';
        })
      )
      .selectAll('text')
      .style('font-size', '10px');
    
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left + 15)
      .attr('x', 0 - (height / 2))
      .style('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', '#666')
      .text('Energy (TWh)');
    
    // 범례는 별도 그룹으로 생성 (hover 영향 받지 않음)
    const legend = g.append('g')
      .attr('class', 'chart-legend')
      .attr('transform', `translate(5, -25)`);
    
    keys.forEach((key, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(${i * 85}, 0)`)
        .style('cursor', 'pointer')
        .on('click', function() {
          // 이미 선택된 소스를 다시 클릭하면 선택 해제
          if (selectedEnergySource === key) {
            setSelectedEnergySource(null);
          } else {
            setSelectedEnergySource(key);
          }
        });
      
      legendItem.append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', colorScale(key))
        .attr('fill-opacity', selectedEnergySource && selectedEnergySource !== key ? 0.3 : 1)
        .attr('stroke', selectedEnergySource === key ? '#333' : 'none')
        .attr('stroke-width', selectedEnergySource === key ? 2 : 0);
      
      legendItem.append('text')
        .attr('x', 13)
        .attr('y', 8)
        .style('font-size', '10px')
        .style('fill', selectedEnergySource && selectedEnergySource !== key ? '#999' : '#333')
        .style('font-weight', selectedEnergySource === key ? 'bold' : 'normal')
        .text(key);
    });
    
    if (allData.find(d => d.시점 === currentYear)) {
      g.append('line')
        .attr('x1', xScale(currentYear) + xScale.bandwidth() / 2)
        .attr('x2', xScale(currentYear) + xScale.bandwidth() / 2)
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', '#333')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.7);
    }
  };

  const updateNeededEnergyPie = () => {
    if (!neededEnergyPieRef.current) return;
    
    const svg = d3.select(neededEnergyPieRef.current);
    svg.selectAll("*").remove();
    
    // 순서 변경, 기타 제거
    const data = [
      { name: '화석연료', value: energyMixPercentages.fossil, color: '#ff7f0e' },
      { name: '원자력', value: energyMixPercentages.nuclear, color: '#1f77b4' },
      { name: '신재생', value: energyMixPercentages.renewable, color: '#2ca02c' },
      { name: '수력', value: energyMixPercentages.hydro, color: '#17a2b8' }
    ];
    
    const viewBoxWidth = 200;
    const viewBoxHeight = 200;
    const width = viewBoxWidth;
    const height = viewBoxHeight;
    const radius = Math.min(width, height) / 2 - 10;
    
    svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
       .attr('preserveAspectRatio', 'xMidYMid meet')
       .style('width', '100%')
       .style('height', '100%');
    
    const g = svg.append('g')
      .attr('transform', `translate(${width/2}, ${height/2})`);
    
    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);
    
    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);
    
    const arcs = g.selectAll('.arc')
      .data(pie(data))
      .enter().append('g')
      .attr('class', 'arc');
    
    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color);
    
    arcs.append('text')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .style('font-size', '9px')
      .style('fill', 'white')
      .style('font-weight', 'bold')
      .text(d => d.data.value >= 10 ? `${d.data.value.toFixed(1)}%` : '');
  };

  // 각 슬라이더의 최대값을 계산하는 함수
  const getSliderMaxValue = (type) => {
    if (fixedSliders[type]) {
      // 고정된 슬라이더는 현재 값에서 움직일 수 없음
      return energyMixPercentages[type];
    }
    
    // 다른 고정된 슬라이더들의 합 계산 (현재 슬라이더 제외)
    const otherFixedTotal = Object.keys(fixedSliders)
      .filter(key => key !== type && fixedSliders[key])
      .reduce((sum, key) => sum + energyMixPercentages[key], 0);
    
    // 고정되지 않은 다른 슬라이더들의 최소값 합 계산
    const otherUnfixedTypes = ['fossil', 'nuclear', 'renewable', 'hydro']
      .filter(key => key !== type && !fixedSliders[key]);
    const otherUnfixedMinTotal = otherUnfixedTypes.length * 0.1;
    
    // 현재 슬라이더가 가질 수 있는 최대값
    const maxValue = 100 - otherFixedTotal - otherUnfixedMinTotal;
    
    return Math.min(99.9, Math.max(0.1, maxValue));
  };

  // 퍼센트 정규화 함수 수정
  const normalizePercentages = (changedType, newValue) => {
    const minValue = 0.1;
    
    // 고정된 슬라이더는 변경 불가
    if (fixedSliders[changedType]) {
      return;
    }
    
    // 고정된 슬라이더 수 계산
    const fixedCount = Object.values(fixedSliders).filter(Boolean).length;
    
    // 3개 이상이 고정되어 있으면 변경 불허
    if (fixedCount >= 3) {
      return;
    }
    
    // 최대값 제한 적용
    const maxValue = getSliderMaxValue(changedType);
    const clampedValue = Math.max(minValue, Math.min(maxValue, newValue));
    
    // 모든 에너지 타입
    const allTypes = ['fossil', 'nuclear', 'renewable', 'hydro'];
    
    // 고정된 슬라이더들 (변경된 슬라이더 제외)
    const fixedTypes = allTypes.filter(type => fixedSliders[type] && type !== changedType);
    
    // 고정되지 않은 슬라이더들 (변경된 슬라이더 제외)
    const adjustableTypes = allTypes.filter(type => !fixedSliders[type] && type !== changedType);
    
    // 고정된 슬라이더들의 총합
    const fixedTotal = fixedTypes.reduce((sum, type) => sum + energyMixPercentages[type], 0);
    
    // 남은 비율 (100% - 변경된 값 - 고정된 값들)
    const remainingTotal = 100 - clampedValue - fixedTotal;
    
    // 새로운 퍼센티지 객체 생성
    const newPercentages = { ...energyMixPercentages };
    newPercentages[changedType] = clampedValue;
    
    if (adjustableTypes.length > 0) {
      if (remainingTotal > 0) {
        // 조정 가능한 슬라이더들의 현재 총합
        const currentAdjustableTotal = adjustableTypes.reduce((sum, type) => sum + energyMixPercentages[type], 0);
        
        if (currentAdjustableTotal > 0) {
          // 비례적으로 재분배
          adjustableTypes.forEach(type => {
            const ratio = energyMixPercentages[type] / currentAdjustableTotal;
            const newVal = ratio * remainingTotal;
            newPercentages[type] = Math.max(minValue, newVal);
          });
          
          // 최소값 적용으로 인한 오차 보정
          const actualTotal = Object.values(newPercentages).reduce((sum, val) => sum + val, 0);
          if (Math.abs(actualTotal - 100) > 0.01) {
            const diff = 100 - actualTotal;
            
            // 최소값보다 큰 값을 가진 조정 가능한 타입들로 오차 분산
            const distributeTypes = adjustableTypes.filter(type => newPercentages[type] > minValue + 0.1);
            
            if (distributeTypes.length > 0) {
              const distributeTotal = distributeTypes.reduce((sum, type) => sum + newPercentages[type], 0);
              distributeTypes.forEach(type => {
                const ratio = newPercentages[type] / distributeTotal;
                const adjustment = ratio * diff;
                newPercentages[type] = Math.max(minValue, newPercentages[type] + adjustment);
              });
            }
          }
        } else {
          // 현재 총합이 0인 경우 균등 분배
          const equalShare = remainingTotal / adjustableTypes.length;
          adjustableTypes.forEach(type => {
            newPercentages[type] = Math.max(minValue, equalShare);
          });
        }
      } else {
        // 남은 비율이 0보다 작거나 같은 경우 모든 조정 가능한 슬라이더를 최소값으로
        adjustableTypes.forEach(type => {
          newPercentages[type] = minValue;
        });
      }
    }
    
    setEnergyMixPercentages(newPercentages);
  };

  // 슬라이더 배경 업데이트 함수
  const updateSliderBackground = (type, value, isFixed = false) => {
    const percentage = (value / 100) * 100;
    const fillColor = isFixed ? '#666' : '#2196F3';
    const backgroundColor = '#ddd';
    
    return `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${percentage}%, ${backgroundColor} ${percentage}%, ${backgroundColor} 100%)`;
  };

  const handleSliderChange = (type, value) => {
    // 고정된 슬라이더는 변경 불가
    if (fixedSliders[type]) {
      return;
    }
    
    const newValue = parseFloat(value);
    
    // 최대값 제한 확인
    const maxValue = getSliderMaxValue(type);
    if (newValue > maxValue) {
      // 최대값을 초과하면 변경하지 않음
      return;
    }
    
    normalizePercentages(type, newValue);
  };

  // 고정 체크박스 토글 함수
  const handleFixedToggle = (type) => {
    const newFixedSliders = { ...fixedSliders };
    newFixedSliders[type] = !newFixedSliders[type];
    
    // 3개 이상 고정하려고 할 때 방지
    const fixedCount = Object.values(newFixedSliders).filter(Boolean).length;
    if (fixedCount > 3) {
      return; // 3개 초과 고정 방지
    }
    
    setFixedSliders(newFixedSliders);
  };

  // 예산 계산 함수 - TWh로 입력받고 백만원/GWh 단가 적용
  const calculateBudget = () => {
    if (neededEnergy === 0) return '0';
    
    // neededEnergy는 TWh 단위, 1 TWh = 1000 GWh
    const energyAmountsInGWh = {
      fossil: (neededEnergy * energyMixPercentages.fossil * 1000) / 100,
      nuclear: (neededEnergy * energyMixPercentages.nuclear * 1000) / 100,
      renewable: (neededEnergy * energyMixPercentages.renewable * 1000) / 100,
      hydro: (neededEnergy * energyMixPercentages.hydro * 1000) / 100
    };
    
    const priceMapping = {
      fossil: energyPrice.화석연료,
      nuclear: energyPrice.원자력,
      renewable: energyPrice.신재생,
      hydro: energyPrice.수력
    };
    
    let totalCost = 0;
    Object.keys(energyAmountsInGWh).forEach(type => {
      totalCost += energyAmountsInGWh[type] * priceMapping[type];
    });
    
    return (totalCost / 100).toFixed(2);
  };

  return (
    <div id="korea-view" className="view-container">
      <div className="korea-layout">
        <div className="chart-section small-map" style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
          <div className="map-container">
            <h3>Selected Country: South Korea</h3>
            <svg ref={koreaSmallMapRef} id="korea-small-map"></svg>
          </div>
          <div className="source-container">
            <h3>Energy Source</h3>
            <svg ref={koreaPieChartRef} id="korea-pie-chart"></svg>
            <div className="pie-legend">
              <div className="legend-item"><span className="legend-color fossil"></span>화석연료</div>
              <div className="legend-item"><span className="legend-color nuclear"></span>원자력</div>
              <div className="legend-item"><span className="legend-color renewable"></span>신재생에너지</div>
              <div className="legend-item"><span className="legend-color hydro"></span>수력</div>
            </div>
          </div>
        </div>
        
        <div className="chart-section">
          <h3 style={{margin: '0 0 10px 0', color: '#333', fontSize: '15px', fontWeight: '600'}}>
            Energy Supply & Demand Changes by Year
            <span 
              className={`info-icon-container ${!infoIconsClicked.energyChanges ? 'glow' : 'clicked'}`}
              onClick={() => handleInfoIconClick('energyChanges', setShowInfoPopup)}
              style={{cursor: 'pointer', display: 'inline-flex', alignItems: 'center', marginLeft: '10px'}}
            >
              <svg 
                className="info-icon"
                viewBox="0 0 16 16" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg" 
                style={{
                  width: '10px',
                  height: '10px', 
                  minWidth: '10px',
                  minHeight: '10px',
                  maxWidth: '10px',
                  maxHeight: '10px',
                  marginRight: '1px', 
                  verticalAlign: 'middle',
                  display: 'inline-block',
                  flexShrink: '0'
                }}
              >
                <path d="M7.37516 11.9582H8.62512V7.16657H7.37516V11.9582ZM8.00014 5.74029C8.19085 5.74029 8.35071 5.67579 8.47971 5.54679C8.60871 5.41779 8.67321 5.25794 8.67321 5.06723C8.67321 4.87654 8.60871 4.71668 8.47971 4.58767C8.35071 4.45867 8.19085 4.39417 8.00014 4.39417C7.80943 4.39417 7.64958 4.45867 7.52058 4.58767C7.39158 4.71668 7.32708 4.87654 7.32708 5.06723C7.32708 5.25794 7.39158 5.41779 7.52058 5.54679C7.64958 5.67579 7.80943 5.74029 8.00014 5.74029ZM8.00154 15.9165C6.90659 15.9165 5.8774 15.7088 4.91396 15.2932C3.9505 14.8777 3.11243 14.3137 2.39975 13.6013C1.68705 12.889 1.12284 12.0513 0.7071 11.0882C0.291364 10.1252 0.0834961 9.09624 0.0834961 8.00129C0.0834961 6.90635 0.291274 5.87716 0.70683 4.91371C1.12239 3.95025 1.68634 3.11218 2.3987 2.3995C3.11108 1.68681 3.94878 1.12259 4.91181 0.706857C5.87482 0.291121 6.9038 0.083252 7.99875 0.083252C9.09369 0.083252 10.1229 0.291031 11.0863 0.706586C12.0498 1.12214 12.8879 1.6861 13.6005 2.39846C14.3132 3.11084 14.8774 3.94854 15.2932 4.91157C15.7089 5.87458 15.9168 6.90356 15.9168 7.9985C15.9168 9.09345 15.709 10.1226 15.2935 11.0861C14.8779 12.0495 14.3139 12.8876 13.6016 13.6003C12.8892 14.313 12.0515 14.8772 11.0885 15.2929C10.1255 15.7087 9.09648 15.9165 8.00154 15.9165ZM8.00014 14.6666C9.86125 14.6666 11.4376 14.0207 12.7293 12.7291C14.021 11.4374 14.6668 9.86101 14.6668 7.9999C14.6668 6.13879 14.021 4.5624 12.7293 3.27073C11.4376 1.97907 9.86125 1.33323 8.00014 1.33323C6.13903 1.33323 4.56264 1.97907 3.27098 3.27073C1.97931 4.5624 1.33348 6.13879 1.33348 7.9999C1.33348 9.86101 1.97931 11.4374 3.27098 12.7291C4.56264 14.0207 6.13903 14.6666 8.00014 14.6666Z" fill="#888888"/>
              </svg>
              <span className="info-text" style={{fontSize: '10px', color: '#888888', fontWeight: 'normal', display: 'inline', verticalAlign: 'middle'}}>
                Tip: 생산량이 소비량보다 많은 이유
              </span>
            </span>
          </h3>
          <svg ref={koreaLineChartRef} id="korea-line-chart"></svg>
        </div>
        
        <div className="chart-section">
          <h3>Energy Source Changes by Year</h3>
          <svg ref={koreaStackedChartRef} id="korea-stacked-chart"></svg>
        </div>
        
        <div className="chart-section energy-calculator">
          <h3 style={{margin: '0 0 10px 0', color: '#333', fontSize: '15px', fontWeight: '600'}}>
            Energy Budget Simulation 
            <span 
              className={`info-icon-container ${!infoIconsClicked.energyBudget ? 'glow' : 'clicked'}`}
              onClick={() => handleInfoIconClick('energyBudget', setShowBudgetInfoPopup)}
              style={{cursor: 'pointer', display: 'inline-flex', alignItems: 'center', marginLeft: '10px'}}
            >
              <svg 
                className="info-icon"
                viewBox="0 0 16 16" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg" 
                style={{
                  width: '10px',
                  height: '10px', 
                  minWidth: '10px',
                  minHeight: '10px',
                  maxWidth: '10px',
                  maxHeight: '10px',
                  marginRight: '1px', 
                  verticalAlign: 'middle',
                  display: 'inline-block',
                  flexShrink: '0'
                }}
              >
                <path d="M7.37516 11.9582H8.62512V7.16657H7.37516V11.9582ZM8.00014 5.74029C8.19085 5.74029 8.35071 5.67579 8.47971 5.54679C8.60871 5.41779 8.67321 5.25794 8.67321 5.06723C8.67321 4.87654 8.60871 4.71668 8.47971 4.58767C8.35071 4.45867 8.19085 4.39417 8.00014 4.39417C7.80943 4.39417 7.64958 4.45867 7.52058 4.58767C7.39158 4.71668 7.32708 4.87654 7.32708 5.06723C7.32708 5.25794 7.39158 5.41779 7.52058 5.54679C7.64958 5.67579 7.80943 5.74029 8.00014 5.74029ZM8.00154 15.9165C6.90659 15.9165 5.8774 15.7088 4.91396 15.2932C3.9505 14.8777 3.11243 14.3137 2.39975 13.6013C1.68705 12.889 1.12284 12.0513 0.7071 11.0882C0.291364 10.1252 0.0834961 9.09624 0.0834961 8.00129C0.0834961 6.90635 0.291274 5.87716 0.70683 4.91371C1.12239 3.95025 1.68634 3.11218 2.3987 2.3995C3.11108 1.68681 3.94878 1.12259 4.91181 0.706857C5.87482 0.291121 6.9038 0.083252 7.99875 0.083252C9.09369 0.083252 10.1229 0.291031 11.0863 0.706586C12.0498 1.12214 12.8879 1.6861 13.6005 2.39846C14.3132 3.11084 14.8774 3.94854 15.2932 4.91157C15.7089 5.87458 15.9168 6.90356 15.9168 7.9985C15.9168 9.09345 15.709 10.1226 15.2935 11.0861C14.8779 12.0495 14.3139 12.8876 13.6016 13.6003C12.8892 14.313 12.0515 14.8772 11.0885 15.2929C10.1255 15.7087 9.09648 15.9165 8.00154 15.9165ZM8.00014 14.6666C9.86125 14.6666 11.4376 14.0207 12.7293 12.7291C14.021 11.4374 14.6668 9.86101 14.6668 7.9999C14.6668 6.13879 14.021 4.5624 12.7293 3.27073C11.4376 1.97907 9.86125 1.33323 8.00014 1.33323C6.13903 1.33323 4.56264 1.97907 3.27098 3.27073C1.97931 4.5624 1.33348 6.13879 1.33348 7.9999C1.33348 9.86101 1.97931 11.4374 3.27098 12.7291C4.56264 14.0207 6.13903 14.6666 8.00014 14.6666Z" fill="#888888"/>
              </svg>
              <span className="info-text" style={{fontSize: '10px', color: '#888888', fontWeight: 'normal', display: 'inline', verticalAlign: 'middle'}}>
                Tip: 발전 예산 시뮬레이션 사용법
              </span>
            </span>
          </h3>
          <div className="calculator-content">
            <div className="energy-input">
              <label>Needed Energy: </label>
              <input 
                type="number" 
                id="needed-energy" 
                placeholder="300" 
                min="0"
                step="1"
                value={neededEnergy}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setNeededEnergy(0);
                  } else {
                    const parsedValue = parseFloat(value);
                    if (!isNaN(parsedValue)) {
                      setNeededEnergy(parsedValue);
                    }
                  }
                }}
              />
              <label>TWh</label>
            </div>
            
            <div className="energy-controls">
              <div className="energy-sliders">
                {['fossil', 'nuclear', 'renewable', 'hydro'].map((type) => {
                  const value = energyMixPercentages[type];
                  const colors = {
                    fossil: '#ff7f0e',
                    nuclear: '#1f77b4', 
                    renewable: '#2ca02c', 
                    hydro: '#17a2b8'
                  };
                  const labels = { 
                    fossil: '화석연료',
                    nuclear: '원자력', 
                    renewable: '신재생', 
                    hydro: '수력'
                  };
                  
                  // 슬라이더 상태 계산
                  const fixedCount = Object.values(fixedSliders).filter(Boolean).length;
                  const isFixed = fixedSliders[type];
                  const isDisabled = isFixed || (fixedCount >= 3 && !isFixed);
                  
                  return (
                    <div key={type} className="slider-group">
                      <label>
                        <span 
                          className="energy-type-indicator" 
                          style={{ 
                            backgroundColor: colors[type], // 항상 원래 색상 유지
                            transition: 'background-color 0.3s ease'
                          }}
                        ></span>
                        <span style={{ 
                          color: isFixed ? '#999' : '#555',
                          transition: 'color 0.3s ease'
                        }}>
                          {labels[type]} <span style={{ marginLeft: '8px' }}>{value.toFixed(1)}</span>%
                        </span>
                      </label>
                      <div className="slider-container">
                        <input 
                          type="range" 
                          min="0.1" 
                          max="100" // 항상 100으로 고정
                          step="0.1"
                          value={value}
                          onChange={(e) => handleSliderChange(type, e.target.value)}
                          onInput={(e) => handleSliderChange(type, e.target.value)}
                          disabled={isDisabled}
                          className={isFixed ? 'fixed-slider' : ''}
                          style={{
                            opacity: isDisabled ? 0.5 : 1,
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            transition: 'opacity 0.3s ease',
                            background: updateSliderBackground(type, value, isFixed)
                          }}
                        />
                        <div className="slider-controls">
                          <label className="checkbox-container">
                            <input
                              type="checkbox"
                              checked={fixedSliders[type]}
                              onChange={() => handleFixedToggle(type)}
                              disabled={!fixedSliders[type] && fixedCount >= 3}
                            />
                            <span className="checkbox-text">고정</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="energy-pie-container">
                <svg ref={neededEnergyPieRef} id="needed-energy-pie"></svg>
              </div>
            </div>
            
            <div style={{ marginTop: '10px' }}>
              <div style={{ 
                fontSize: '10px', 
                color: '#888', 
                textAlign: 'center', 
                marginBottom: '5px',
                fontStyle: 'italic'
              }}>
                * 2024년 기준 에너지원별 평균 단가 적용
              </div>
              <div className="budget-result">
                <h4>Needed Energy Budget: <span id="calculated-budget">{calculateBudget()}억</span> KRW</h4>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <InfoPopup 
        showPopup={showInfoPopup} 
        onClose={() => setShowInfoPopup(false)} 
      />

      <PopupEnergyBudget 
        showPopup={showBudgetInfoPopup} 
        onClose={() => setShowBudgetInfoPopup(false)} 
      />
    </div>
  );
};

export default Korea;
