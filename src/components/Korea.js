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
  koreaEnergySource,
  southKoreaEnergyAll,
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

  // State for tracking which info icons have been clicked
  const [infoIconsClicked, setInfoIconsClicked] = useState({
    energyChanges: false,
    energyBudget: false
  });

  // Handler for info icon clicks
  const handleInfoIconClick = (iconType, showPopupFunc) => {
    // Mark this icon as clicked
    setInfoIconsClicked(prev => ({
      ...prev,
      [iconType]: true
    }));
    
    // Show the popup
    showPopupFunc(true);
  };

  // 데이터 변환 함수 - NaN을 0으로 처리, 기타 제거
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

  // Korea visualizations effects
  useEffect(() => {
    const timer = setTimeout(() => {
      drawKoreaSmallMap();
      drawKoreaPieChart();
      drawKoreaLineChart();
      drawKoreaStackedChart();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [currentYear]);

  // Needed Energy Pie Chart - 실시간 업데이트
  useEffect(() => {
    updateNeededEnergyPie();
  }, [energyMixPercentages]);

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
    if (!koreaLineChartRef.current) return;
    
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
    
    // 범례
    const legend = svg.append('g')
      .attr('transform', `translate(${viewBoxWidth - margin.right + 5}, ${margin.top + 5})`);
    
    Object.keys(labels).forEach((key, i) => {
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
    
    Object.keys(lineData).forEach((key, index) => {
      const circle = focus.append('circle')
        .attr('class', `circle-${key}`)
        .attr('r', 4)
        .style('fill', colors[key])
        .style('stroke', 'white')
        .style('stroke-width', 2);
      
      // Add background rectangle for text readability
      const textBg = focus.append('rect')
        .attr('class', `text-bg-${key}`)
        .style('fill', 'rgba(255, 255, 255, 0.8)')
        .style('stroke', 'none')
        .attr('rx', 2);
      
      const text = focus.append('text')
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
      
             // Collect all data points for the selected year and sort by value
       const allDataPoints = Object.keys(lineData).map((key, index) => {
         const dataPoint = lineData[key].find(d => d.year === selectedYear);
         return dataPoint ? { key, index, ...dataPoint } : null;
       }).filter(d => d !== null).sort((a, b) => b.value - a.value);
       
       // Smart label positioning to avoid overlap
       const labelHeight = 15;
       const minLabelSpacing = 18;
       const positions = [];
       
       allDataPoints.forEach((dataPoint, sortedIndex) => {
         const circle = focus.select(`.circle-${dataPoint.key}`);
         const text = focus.select(`.text-${dataPoint.key}`);
         const textBg = focus.select(`.text-bg-${dataPoint.key}`);
         
         circle
           .attr('cx', xScale(dataPoint.year))
           .attr('cy', yScale(dataPoint.value));
         
         // Calculate optimal label position
         let idealY = yScale(dataPoint.value) - 15;
         
         // Check for conflicts with existing labels
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
           
           // Try positioning above and below the ideal position alternately
           if (attempts % 2 === 0) {
             finalY = idealY - ((attempts + 2) / 2) * minLabelSpacing;
           } else {
             finalY = idealY + ((attempts + 1) / 2) * minLabelSpacing;
           }
           attempts++;
         }
         
         // Ensure labels stay within chart bounds (but can overlap with chart content)
         finalY = Math.max(finalY, 5); // Don't go above chart
         finalY = Math.min(finalY, height + 30); // Don't go too far below chart
         
         positions.push(finalY);
         
         const textContent = `${dataPoint.value.toFixed(1)}`;
         text
           .attr('x', xScale(dataPoint.year))
           .attr('y', finalY)
           .text(textContent);
         
         // Position and size background rectangle
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

    // Add current year indicator
    if (years.includes(currentYear)) {
      // Vertical dotted line for current year
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

      // Current year values labels below x-axis
      const currentYearData = {
        production: lineData.production.find(d => d.year === currentYear),
        imports: lineData.imports.find(d => d.year === currentYear),
        consumption: lineData.consumption.find(d => d.year === currentYear)
      };

      const labelColors = { production: '#2196F3', imports: '#e53e3e', consumption: '#666' };
      const labelTexts = { production: '생산', imports: '수입', consumption: '소비' };

      // Position labels below x-axis
      const labelStartY = height + 50; // Start below x-axis
      const labelSpacing = 15; // Space between each label

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

      // Add circle indicators on the lines for current year
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
    const keys = ['화석연료', '원자력', '신재생에너지', '수력'];
    const colors = ['#ff7f0e', '#1f77b4', '#2ca02c', '#17a2b8'];
    
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
    const dataRects = g.append('g')
      .attr('class', 'data-rects')
      .selectAll('g')
      .data(stackedData)
      .join('g')
      .attr('fill', d => colorScale(d.key))
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
        .attr('transform', `translate(${i * 85}, 0)`);
      
      legendItem.append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', colorScale(key));
      
      legendItem.append('text')
        .attr('x', 13)
        .attr('y', 8)
        .style('font-size', '10px')
        .style('fill', '#333')
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

  // 퍼센트 정규화 함수 수정 (기타 제거)
  const normalizePercentages = (changedType, newValue) => {
    const minValue = 0.1;
    const maxValue = 99.7; // 다른 3개가 최소 0.1씩 가져야 하므로
    
    const clampedValue = Math.max(minValue, Math.min(maxValue, newValue));
    
    const newPercentages = { ...energyMixPercentages };
    newPercentages[changedType] = clampedValue;
    
    // 기타 제거된 타입들만 처리
    const otherTypes = ['nuclear', 'fossil', 'renewable', 'hydro'].filter(type => type !== changedType);
    const remainingTotal = 100 - clampedValue;
    const currentOtherTotal = otherTypes.reduce((sum, type) => sum + energyMixPercentages[type], 0);
    
    if (currentOtherTotal > 0) {
      otherTypes.forEach(type => {
        const ratio = energyMixPercentages[type] / currentOtherTotal;
        const newVal = ratio * remainingTotal;
        newPercentages[type] = Math.max(minValue, newVal);
      });
      
      const finalTotal = Object.values(newPercentages).reduce((sum, val) => sum + val, 0);
      if (finalTotal !== 100) {
        const finalDiff = 100 - finalTotal;
        const adjustableTypes = otherTypes.filter(type => newPercentages[type] > minValue);
        
        if (adjustableTypes.length > 0) {
          const adjustableTotal = adjustableTypes.reduce((sum, type) => sum + newPercentages[type], 0);
          adjustableTypes.forEach(type => {
            const ratio = newPercentages[type] / adjustableTotal;
            const adjustment = ratio * finalDiff;
            newPercentages[type] = Math.max(minValue, newPercentages[type] + adjustment);
          });
        }
      }
    }
    
    setEnergyMixPercentages(newPercentages);
  };

  const handleSliderChange = (type, value) => {
    const newValue = parseFloat(value);
    normalizePercentages(type, newValue);
  };

  // 예산 계산 함수 수정 - TWh로 입력받고 백만원/GWh 단가 적용
  const calculateBudget = () => {
    if (neededEnergy === 0) return '0';
    
    // neededEnergy는 이제 TWh 단위, 1 TWh = 1000 GWh
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
                생산량이 소비량보다 많은 이유
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
                발전 예산 시뮬레이션 사용법
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
                  
                  return (
                    <div key={type} className="slider-group">
                      <label>
                        <span 
                          className="energy-type-indicator" 
                          style={{ backgroundColor: colors[type] }}
                        ></span>
                            {labels[type]} <span style={{ marginLeft: '8px' }}>{value.toFixed(1)}</span>%
                      </label>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="99.7" 
                        step="0.1"
                        value={value}
                        onChange={(e) => handleSliderChange(type, e.target.value)}
                        onInput={(e) => handleSliderChange(type, e.target.value)}
                      />
                    </div>
                  );
                })}
              </div>
              
              <div className="energy-pie-container">
                <svg ref={neededEnergyPieRef} id="needed-energy-pie"></svg>
              </div>
            </div>
            
            <div className="budget-result">
              <h4>Needed Energy Budget: <span id="calculated-budget">{calculateBudget()}억</span> KRW</h4>
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
