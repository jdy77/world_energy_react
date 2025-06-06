import React, { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import InfoPopup from './PopupBackup';
import '../css/korea.css';

const Korea = ({ 
  currentYear,
  world,
  koreaEnergySource,
  southKoreaEnergyAll,
  southKoreaEnergyProduction,
  energyPrice,
  energyMixPercentages,
  setEnergyMixPercentages,
  neededEnergy,
  setNeededEnergy,
  showInfoPopup,
  setShowInfoPopup,
  tooltipRef
}) => {
  const koreaSmallMapRef = useRef();
  const koreaPieChartRef = useRef();
  const koreaLineChartRef = useRef();
  const koreaStackedChartRef = useRef();
  const neededEnergyPieRef = useRef();

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
    
    const yearData = southKoreaEnergyProduction.find(d => d.시점 === currentYear);
    if (!yearData) return;
    
    const data = [
      { name: '원자력', value: yearData.원자력, color: '#1f77b4' },
      { name: '신재생에너지', value: yearData.신재생에너지, color: '#2ca02c' },
      { name: '화석연료', value: yearData.화석연료, color: '#ff7f0e' },
      { name: '수력', value: yearData.수력, color: '#17a2b8' },
      { name: '기타', value: yearData.기타, color: '#9467bd' }
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
        if (tooltipRef.current) {
          const tooltip = d3.select(tooltipRef.current);
          tooltip.style('opacity', 1)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .html(`
              <div><strong>${d.data.name}</strong></div>
              <div>비율: ${percent}%</div>
              <div>실제값: ${d.data.value.toLocaleString()} (1000toe)</div>
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

  const drawKoreaLineChart = () => {
    if (!koreaLineChartRef.current) return;
    
    const svg = d3.select(koreaLineChartRef.current);
    svg.selectAll("*").remove();
    
    const viewBoxWidth = 600;
    const viewBoxHeight = 280;
    const margin = { top: 15, right: 70, bottom: 35, left: 50 };
    const width = viewBoxWidth - margin.left - margin.right;
    const height = viewBoxHeight - margin.top - margin.bottom;
    
    svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
       .attr('preserveAspectRatio', 'xMidYMid meet')
       .style('width', '100%')
       .style('height', '100%');
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    const lineData = {
      production: southKoreaEnergyAll.map(d => ({ year: d.시점, value: d.생산 })),
      imports: southKoreaEnergyAll.map(d => ({ year: d.시점, value: d.순수입 })),
      consumption: southKoreaEnergyAll.map(d => ({ year: d.시점, value: d.소비 }))
    };
    
    const years = southKoreaEnergyAll.map(d => d.시점);
    
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
      .text('Energy (1000toe)');
    
    const colors = { production: '#2196F3', imports: '#e53e3e', consumption: '#666' };
    const labels = { production: '생산', imports: '순수입', consumption: '소비' };
    
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
    
    Object.keys(lineData).forEach(key => {
      const circle = focus.append('circle')
        .attr('class', `circle-${key}`)
        .attr('r', 4)
        .style('fill', colors[key])
        .style('stroke', 'white')
        .style('stroke-width', 2);
      
      const text = focus.append('text')
        .attr('class', `text-${key}`)
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', colors[key])
        .style('text-anchor', 'middle')
        .attr('dy', '-8px');
    });
    
    const yearText = focus.append('text')
      .attr('class', 'year-text')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .style('text-anchor', 'middle')
      .attr('y', height + 15);
    
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
      
      Object.keys(lineData).forEach((key, index) => {
        const dataPoint = lineData[key].find(d => d.year === selectedYear);
        if (dataPoint) {
          const circle = focus.select(`.circle-${key}`);
          const text = focus.select(`.text-${key}`);
          
          circle
            .attr('cx', xScale(dataPoint.year))
            .attr('cy', yScale(dataPoint.value));
          
          text
            .attr('x', xScale(dataPoint.year))
            .attr('y', yScale(dataPoint.value))
            .text(`${dataPoint.value.toFixed(1)}`);
        }
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
    
    const allData = southKoreaEnergyProduction;
    const keys = ['원자력', '신재생에너지', '화석연료', '수력', '기타'];
    const colors = ['#1f77b4', '#2ca02c', '#ff7f0e', '#17a2b8', '#9467bd'];
    
    const stack = d3.stack().keys(keys);
    const stackedData = stack(allData);
    
    const xScale = d3.scaleBand()
      .domain(allData.map(d => d.시점))
      .range([0, width])
      .padding(0.08);
    
    const maxTotal = d3.max(allData, d => d.원자력 + d.신재생에너지 + d.화석연료 + d.수력 + d.기타);
    
    const yScale = d3.scaleLinear()
      .domain([0, maxTotal])
      .nice()
      .range([height, 0]);
    
    const colorScale = d3.scaleOrdinal()
      .domain(keys)
      .range(colors);
    
    g.append('g')
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
        
        g.selectAll('rect')
          .style('opacity', function() {
            const rectData = d3.select(this).datum();
            return rectData && rectData.data && rectData.data.시점 === year ? 1 : 0.3;
          });
        
        if (tooltipRef.current && yearData) {
          const tooltip = d3.select(tooltipRef.current);
          tooltip.style('opacity', 1)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .html(`
              <div><strong>${year}년 (단위: 1000toe)</strong></div>
              <div>원자력: ${yearData.원자력.toLocaleString()}</div>
              <div>신재생에너지: ${yearData.신재생에너지.toLocaleString()}</div>
              <div>화석연료: ${yearData.화석연료.toLocaleString()}</div>
              <div>수력: ${yearData.수력.toLocaleString()}</div>
              <div>기타: ${yearData.기타.toLocaleString()}</div>
              <div><strong>총합: ${(yearData.원자력 + yearData.신재생에너지 + yearData.화석연료 + yearData.수력 + yearData.기타).toLocaleString()}</strong></div>
            `);
        }
      })
      .on('mouseout', () => {
        g.selectAll('rect').style('opacity', 1);
        
        if (tooltipRef.current) {
          d3.select(tooltipRef.current).style('opacity', 0);
        }
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
          if (d >= 1000000) return (d / 1000000).toFixed(0) + 'M';
          if (d >= 1000) return (d / 1000).toFixed(0) + 'k';
          return d;
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
      .text('Energy (1000toe)');
    
    const legend = g.append('g')
      .attr('class', 'legend')
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
    
    const data = [
      { name: '원자력', value: energyMixPercentages.nuclear, color: '#1f77b4' },
      { name: '신재생', value: energyMixPercentages.renewable, color: '#2ca02c' },
      { name: '화석연료', value: energyMixPercentages.fossil, color: '#ff7f0e' },
      { name: '수력', value: energyMixPercentages.hydro, color: '#17a2b8' },
      { name: '기타', value: energyMixPercentages.other, color: '#9467bd' }
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

  // 퍼센트 정규화 함수
  const normalizePercentages = (changedType, newValue) => {
    const minValue = 0.1;
    const maxValue = 99.6;
    
    const clampedValue = Math.max(minValue, Math.min(maxValue, newValue));
    
    const newPercentages = { ...energyMixPercentages };
    newPercentages[changedType] = clampedValue;
    
    const otherTypes = Object.keys(newPercentages).filter(type => type !== changedType);
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

  // 예산 계산 함수
  const calculateBudget = () => {
    if (neededEnergy === 0) return '0';
    
    const energyAmounts = {
      nuclear: (neededEnergy * energyMixPercentages.nuclear) / 100,
      fossil: (neededEnergy * energyMixPercentages.fossil) / 100,
      renewable: (neededEnergy * energyMixPercentages.renewable) / 100,
      hydro: (neededEnergy * energyMixPercentages.hydro) / 100,
      other: (neededEnergy * energyMixPercentages.other) / 100
    };
    
    const priceMapping = {
      nuclear: energyPrice.원자력,
      fossil: energyPrice.화석연료,
      renewable: energyPrice.신재생,
      hydro: energyPrice.수력,
      other: energyPrice.기타
    };
    
    let totalCost = 0;
    Object.keys(energyAmounts).forEach(type => {
      totalCost += energyAmounts[type] * priceMapping[type];
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
              <div className="legend-item"><span className="legend-color nuclear"></span>원자력</div>
              <div className="legend-item"><span className="legend-color renewable"></span>신재생에너지</div>
              <div className="legend-item"><span className="legend-color fossil"></span>화석연료</div>
              <div className="legend-item"><span className="legend-color hydro"></span>수력</div>
              <div className="legend-item"><span className="legend-color other"></span>기타</div>
            </div>
          </div>
        </div>
        
        <div className="chart-section">
          <h3 onClick={() => setShowInfoPopup(true)} style={{cursor: 'pointer', margin: '0 0 10px 0', color: '#333', fontSize: '15px', fontWeight: '600'}}>
            Energy Changes 
            <svg 
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
                marginLeft: '6px', 
                marginRight: '3px', 
                verticalAlign: 'middle',
                display: 'inline-block',
                flexShrink: '0'
              }}
            >
              <path d="M7.37516 11.9582H8.62512V7.16657H7.37516V11.9582ZM8.00014 5.74029C8.19085 5.74029 8.35071 5.67579 8.47971 5.54679C8.60871 5.41779 8.67321 5.25794 8.67321 5.06723C8.67321 4.87654 8.60871 4.71668 8.47971 4.58767C8.35071 4.45867 8.19085 4.39417 8.00014 4.39417C7.80943 4.39417 7.64958 4.45867 7.52058 4.58767C7.39158 4.71668 7.32708 4.87654 7.32708 5.06723C7.32708 5.25794 7.39158 5.41779 7.52058 5.54679C7.64958 5.67579 7.80943 5.74029 8.00014 5.74029ZM8.00154 15.9165C6.90659 15.9165 5.8774 15.7088 4.91396 15.2932C3.9505 14.8777 3.11243 14.3137 2.39975 13.6013C1.68705 12.889 1.12284 12.0513 0.7071 11.0882C0.291364 10.1252 0.0834961 9.09624 0.0834961 8.00129C0.0834961 6.90635 0.291274 5.87716 0.70683 4.91371C1.12239 3.95025 1.68634 3.11218 2.3987 2.3995C3.11108 1.68681 3.94878 1.12259 4.91181 0.706857C5.87482 0.291121 6.9038 0.083252 7.99875 0.083252C9.09369 0.083252 10.1229 0.291031 11.0863 0.706586C12.0498 1.12214 12.8879 1.6861 13.6005 2.39846C14.3132 3.11084 14.8774 3.94854 15.2932 4.91157C15.7089 5.87458 15.9168 6.90356 15.9168 7.9985C15.9168 9.09345 15.709 10.1226 15.2935 11.0861C14.8779 12.0495 14.3139 12.8876 13.6016 13.6003C12.8892 14.313 12.0515 14.8772 11.0885 15.2929C10.1255 15.7087 9.09648 15.9165 8.00154 15.9165ZM8.00014 14.6666C9.86125 14.6666 11.4376 14.0207 12.7293 12.7291C14.021 11.4374 14.6668 9.86101 14.6668 7.9999C14.6668 6.13879 14.021 4.5624 12.7293 3.27073C11.4376 1.97907 9.86125 1.33323 8.00014 1.33323C6.13903 1.33323 4.56264 1.97907 3.27098 3.27073C1.97931 4.5624 1.33348 6.13879 1.33348 7.9999C1.33348 9.86101 1.97931 11.4374 3.27098 12.7291C4.56264 14.0207 6.13903 14.6666 8.00014 14.6666Z" fill="#888888"/>
            </svg>
            <span style={{fontSize: '10px', color: '#888888', fontWeight: 'normal', marginLeft: '0px', display: 'inline', verticalAlign: 'middle'}}>
              생산량이 소비량보다 많은 이유
            </span>
          </h3>
          <svg ref={koreaLineChartRef} id="korea-line-chart"></svg>
        </div>
        
        <div className="chart-section">
          <h3>Energy Source Changes</h3>
          <svg ref={koreaStackedChartRef} id="korea-stacked-chart"></svg>
        </div>
        
        <div className="chart-section energy-calculator">
          <h3>Energy Budget Simulation</h3>
          <div className="calculator-content">
            <div className="energy-input">
              <label>Needed Energy: </label>
              <input 
                type="number" 
                id="needed-energy" 
                placeholder="300000" 
                min="0"
                value={neededEnergy}
                onChange={(e) => setNeededEnergy(parseInt(e.target.value) || 0)}
              />
              <label>1000toe</label>
            </div>
            
            <div className="energy-controls">
              <div className="energy-sliders">
                {['nuclear', 'renewable', 'fossil', 'hydro', 'other'].map((type) => {
                  const value = energyMixPercentages[type];
                  const colors = {
                    nuclear: '#1f77b4', 
                    renewable: '#2ca02c', 
                    fossil: '#ff7f0e', 
                    hydro: '#17a2b8', 
                    other: '#9467bd' 
                  };
                  const labels = { 
                    nuclear: '원자력', 
                    renewable: '신재생', 
                    fossil: '화석연료', 
                    hydro: '수력', 
                    other: '기타' 
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
                        max="99.6" 
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
    </div>
  );
};

export default Korea;
