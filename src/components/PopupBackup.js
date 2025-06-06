import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import southKoreaDailyElectric from '../data/json/south_korea_daily_electric.json';
import '../css/popupbackup.css';

const InfoPopup = ({ showPopup, onClose }) => {
  const chartRef = useRef();

  useEffect(() => {
    if (showPopup && chartRef.current) {
      drawReserveRateChart();
    }
  }, [showPopup]);

  const drawReserveRateChart = () => {
    if (!chartRef.current) return;
    
    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove();
    
    // 데이터 준비
    const data = Object.entries(southKoreaDailyElectric)
      .filter(([year, _]) => !isNaN(parseInt(year))) // 숫자 연도만 필터링
      .map(([year, values]) => ({
        year: parseInt(year),
        rate: values['공급예비율(%)']
      }))
      .sort((a, b) => a.year - b.year);

    const viewBoxWidth = 400;
    const viewBoxHeight = 200;
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = viewBoxWidth - margin.left - margin.right;
    const height = viewBoxHeight - margin.top - margin.bottom;
    
    svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
       .attr('preserveAspectRatio', 'xMidYMid meet')
       .style('width', '100%')
       .style('height', '180px')
       .style('border', '1px solid #ddd')
       .style('border-radius', '4px')
       .style('background', '#fafafa');
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // 스케일 설정
    const xScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.year))
      .range([0, width]);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.rate) * 1.1])
      .nice()
      .range([height, 0]);
    
    // 축 그리기
    g.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(d3.format('d'))
        .ticks(8)
      )
      .selectAll('text')
      .style('font-size', '10px');
    
    g.append('g')
      .call(d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(d => d + '%')
      )
      .selectAll('text')
      .style('font-size', '10px');
    
    // 목표 범위 표시 (15-20%) - 라인보다 먼저 그리기
    const targetArea = g.append('g').attr('class', 'target-area');
    
    targetArea.append('rect')
      .attr('x', 0)
      .attr('y', yScale(20))
      .attr('width', width)
      .attr('height', yScale(15) - yScale(20))
      .attr('fill', '#2196F3')
      .attr('opacity', 0.1);
    
    targetArea.append('text')
      .attr('x', width - 10)
      .attr('y', yScale(20) - 5)
      .attr('text-anchor', 'end')
      .style('font-size', '10px')
      .style('fill', '#2196F3')
      .style('font-weight', '600')
      .text('목표 범위');
    
    // 라인 생성기
    const line = d3.line()
      .x(d => xScale(d.year))
      .y(d => yScale(d.rate))
      .curve(d3.curveMonotoneX);
    
    // 라인 그리기
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#2196F3')
      .attr('stroke-width', 2)
      .attr('d', line);
    
    // 점 그리기
    g.selectAll('.dot')
      .data(data)
      .enter().append('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.year))
      .attr('cy', d => yScale(d.rate))
      .attr('r', 3)
      .attr('fill', '#2196F3');
    
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
    
    // 세로 점선
    focus.append('line')
      .attr('class', 'x-hover-line')
      .attr('y1', 0)
      .attr('y2', height)
      .style('stroke', '#666')
      .style('stroke-width', 1)
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0.8);
    
    // 데이터 포인트 원
    const circle = focus.append('circle')
      .attr('r', 4)
      .style('fill', '#2196F3')
      .style('stroke', 'white')
      .style('stroke-width', 2);
    
    // 값 텍스트
    const valueText = focus.append('text')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', '#2196F3')
      .style('text-anchor', 'middle')
      .attr('dy', '-8px');
    
    // 연도 텍스트
    const yearText = focus.append('text')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .style('text-anchor', 'middle')
      .attr('y', height + 15);
    
    const mousemove = function(event) {
      const [mouseX] = d3.pointer(event);
      const x0 = xScale.invert(mouseX);
      
      const bisect = d3.bisector(d => d.year).left;
      const i = bisect(data, x0, 1);
      const d0 = data[i - 1];
      const d1 = data[i];
      
      if (!d0 || !d1) return;
      
      const selectedData = x0 - d0.year > d1.year - x0 ? d1 : d0;
      
      focus.select('.x-hover-line')
        .attr('x1', xScale(selectedData.year))
        .attr('x2', xScale(selectedData.year));
      
      circle
        .attr('cx', xScale(selectedData.year))
        .attr('cy', yScale(selectedData.rate));
      
      valueText
        .attr('x', xScale(selectedData.year))
        .attr('y', yScale(selectedData.rate))
        .text(`${selectedData.rate}%`);
      
      yearText
        .attr('x', xScale(selectedData.year))
        .text(selectedData.year);
      
      focus.style('display', null);
    };
    
    const mouseout = function() {
      focus.style('display', 'none');
    };
    
    overlay
      .on('mouseover', () => focus.style('display', null))
      .on('mouseout', mouseout)
      .on('mousemove', mousemove);
    
    // 차트 제목
    g.append('text')
      .attr('x', width / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .text('한국 일일 평균 공급예비율 변화 (2001-2025)');
  };

  if (!showPopup) return null;

  return (
    <div className="info-popup-overlay" onClick={onClose}>
      <div className="info-popup" onClick={(e) => e.stopPropagation()}>
        <button 
          className="info-popup-close" 
          onClick={onClose}
        >
          ×
        </button>
        
        <h3 className="info-popup-title">생산량이 소비량보다 많은 이유: 전력예비량</h3>
        
        <div className="info-popup-content">
          <p>
            전력예비량은 전력 공급 시스템에서 <strong>실제 전력 생산량이 소비량보다 많은 여분의 전력</strong>을 의미합니다.
          </p>
          
          <h4>왜 예비량이 필요한가요?</h4>
          <ul>
            <li><strong>전력 수요 변동 대응:</strong> 시간대별, 계절별 전력 사용량 변화에 대응</li>
            <li><strong>설비 고장 대비:</strong> 발전소나 송전 설비의 예상치 못한 고장 상황 대비</li>
            <li><strong>전력 품질 유지:</strong> 안정적인 전압과 주파수 유지를 위한 여유 전력</li>
            <li><strong>비상 상황 대응:</strong> 자연재해나 긴급 상황 시 전력 공급 안정성 확보</li>
          </ul>
          
          <h4>한국의 전력예비량 관리</h4>
          <p>
            한국전력공사는 전력 수급 안정성을 위해 <strong>적정 예비율을 유지</strong>하고 있습니다. 
            일반적으로 최대 전력 수요 대비 15-20%의 예비율을 목표로 관리합니다.
          </p>
          
          <div className="chart-container">
            <svg ref={chartRef}></svg>
          </div>
          
          <div className="highlight-box">
            <strong>생산량 &gt; 소비량</strong>인 이유: 
            전력은 저장이 어려워 실시간으로 생산과 소비의 균형을 맞춰야 하며, 
            안정적인 전력 공급을 위해 항상 여유분을 확보해야 하기 때문입니다.
          </div>
          
          <h4>전력예비량의 활용</h4>
          <div className="narrow-list-container">
            <ul>
              <li>피크 시간대 전력 수요 충족</li>
              <li>발전소 정기점검 시 전력 공급 유지</li>
              <li>전력 수출을 통한 에너지 외교</li>
              <li>신재생에너지 변동성 보완</li>
            </ul>
          </div>
          
          <p>
            <em>
              따라서 차트에서 보이는 '생산량이 소비량보다 높은' 현상은 
              전력 시스템의 안정성과 신뢰성을 보장하기 위한 필수적인 요소입니다.
            </em>
          </p>
        </div>
      </div>
    </div>
  );
};

export default InfoPopup;
