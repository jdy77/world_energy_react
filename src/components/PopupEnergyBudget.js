import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import southKoreaElectricSave from '../data/json/south_korea_electric_save.json';
import southKoreaEnergyPrice24 from '../data/json/south_korea_energy_price_24.json';
import '../css/popupenergybudget.css';

const PopupEnergyBudget = ({ showPopup, onClose }) => {
  const chartRef = useRef();
  const priceChartRef = useRef();

  useEffect(() => {
    if (showPopup && chartRef.current && priceChartRef.current) {
      drawElectricSaveChart();
      drawPriceChart();
    }
  }, [showPopup]);

  const drawPriceChart = () => {
    if (!priceChartRef.current) return;
    
    const svg = d3.select(priceChartRef.current);
    svg.selectAll("*").remove();
    
    // 데이터 준비 - 월별로 정렬
    const data = southKoreaEnergyPrice24
      .sort((a, b) => a.월 - b.월)
      .map(d => ({
        month: d.월,
        nuclear: d.원자력,
        coal: d.석탄,
        oil: d.유류,
        lng: d.LNG,
        pumped: d.양수,
        renewable: d.신재생,
        hydro: d.수력
      }));
    
    const viewBoxWidth = 700;
    const viewBoxHeight = 500;  // 300에서 500으로 증가
    const margin = { top: 30, right: 120, bottom: 50, left: 60 };
    const width = viewBoxWidth - margin.left - margin.right;
    const height = viewBoxHeight - margin.top - margin.bottom;  // 이제 400이 됨
    
    svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
       .attr('preserveAspectRatio', 'xMidYMid meet')
       .style('width', '100%')
       .style('height', '450px')  // 280px에서 450px로 증가
       .style('border', '1px solid #ddd')
       .style('border-radius', '4px')
       .style('background', '#fafafa');
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // 스케일 설정
    const xScale = d3.scaleLinear()
      .domain([1, 12])
      .range([0, width]);
    
    // 모든 에너지원의 최대값 찾기
    const allValues = data.flatMap(d => [d.nuclear, d.coal, d.oil, d.lng, d.pumped, d.renewable, d.hydro]);
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(allValues) * 1.1])
      .nice()
      .range([height, 0]);
    
    // 축 그리기
    g.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(xScale)
        .tickValues([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
        .tickFormat(d => d + '월')
      )
      .selectAll('text')
      .style('font-size', '10px');
    
    g.append('g')
      .call(d3.axisLeft(yScale)
        .ticks(8)
        .tickFormat(d => d.toFixed(0))
      )
      .selectAll('text')
      .style('font-size', '10px');
    
    // y축 레이블
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left + 15)
      .attr('x', 0 - (height / 2))
      .style('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', '#666')
      .text('단가 (백만원/GWh)');
    
    // Korea.js에서 사용하는 색상과 일치
    const colors = {
      nuclear: '#1f77b4',      // 원자력 - 파랑
      fossil: '#ff7f0e',       // 화석연료 - 주황
      hydro: '#17a2b8',        // 수력/양수 - 청록
      renewable: '#2ca02c'     // 신재생 - 초록
    };
    
    // 범례 순서: 화석연료 > 원자력 > 신재생 > 수력
    const energySources = [
      { key: 'coal', name: '화석연료 (석탄)', color: colors.fossil },
      { key: 'oil', name: '화석연료 (유류)', color: colors.fossil },
      { key: 'lng', name: '화석연료 (LNG)', color: colors.fossil },
      { key: 'nuclear', name: '원자력', color: colors.nuclear },
      { key: 'renewable', name: '신재생', color: colors.renewable },
      { key: 'hydro', name: '수력 (수력)', color: colors.hydro },
      { key: 'pumped', name: '수력 (양수)', color: colors.hydro }
    ];
    
    // 선 생성기
    const line = d3.line()
      .x(d => xScale(d.month))
      .y((d, i, arr) => {
        const source = arr.source;
        return yScale(d[source.key]);
      })
      .curve(d3.curveMonotoneX);
    
    // 각 에너지원별로 선 그리기
    energySources.forEach(source => {
      const lineData = data.map(d => ({ ...d, source }));
      lineData.source = source;
      
      g.append('path')
        .datum(lineData)
        .attr('fill', 'none')
        .attr('stroke', source.color)
        .attr('stroke-width', 2)
        .attr('d', line)
        .style('opacity', 0.8);
      
      // 데이터 포인트 - 크기를 약간 키워서 hover 영역 확장
      g.selectAll(`.dot-${source.key}`)
        .data(data)
        .enter().append('circle')
        .attr('class', `dot-${source.key}`)
        .attr('cx', d => xScale(d.month))
        .attr('cy', d => yScale(d[source.key]))
        .attr('r', 4)  // 3에서 4로 증가
        .attr('fill', source.color)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          // 다른 선들 연하게
          g.selectAll('path').style('opacity', 0.2);
          g.selectAll('circle').style('opacity', 0.2);
          
          // 현재 에너지원만 강조
          g.selectAll('path').filter(function() {
            return d3.select(this).attr('stroke') === source.color;
          }).style('opacity', 1);
          
          g.selectAll(`.dot-${source.key}`).style('opacity', 1);
          
          // 툴팁
          const tooltip = d3.select('body').append('div')
            .attr('class', 'chart-tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.9)')
            .style('color', 'white')
            .style('padding', '10px')
            .style('border-radius', '5px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '3000');
          
          tooltip.transition()
            .duration(200)
            .style('opacity', 1);
          
          tooltip.html(`
            <div><strong>${source.name}</strong></div>
            <div>${d.month}월: ${d[source.key].toFixed(1)} 백만원/GWh</div>
          `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
          // 모든 선과 포인트 원래대로
          g.selectAll('path').style('opacity', 0.8);
          g.selectAll('circle').style('opacity', 1);
          
          d3.selectAll('.chart-tooltip').remove();
        });
    });
    
    // 범례
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${margin.left + width + 10}, ${margin.top + 10})`);
    
    energySources.forEach((source, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 18})`);
      
      legendItem.append('line')
        .attr('x1', 0)
        .attr('x2', 15)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', source.color)
        .attr('stroke-width', 3);
      
      legendItem.append('text')
        .attr('x', 20)
        .attr('y', 3)
        .style('font-size', '10px')
        .style('fill', '#333')
        .text(source.name);
    });
    
    // 차트 제목
    g.append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .text('2024년 에너지원별 단가 변화');
  };

  const drawElectricSaveChart = () => {
    if (!chartRef.current) return;
    
    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove();
    
    // 합계 제외하고 데이터 준비 및 정렬
    const data = southKoreaElectricSave
      .filter(d => d.구분 !== '합계')
      .sort((a, b) => b['사용량(kWh)'] - a['사용량(kWh)'])
      .map(d => ({
        category: d.구분,
        original: d['사용량(kWh)'],
        afterReduction: d['감축이후 사용량'],
        reductionAmount: d['사용량(kWh)'] - d['감축이후 사용량'],
        reductionRate: d['감축가능비율(%)'],
        description: d['감축률 설명']
      }));
    
    const viewBoxWidth = 800;  // 너비 증가로 Legend 공간 확보
    const viewBoxHeight = 600;
    const margin = { top: 30, right: 150, bottom: 40, left: 150 };  // 오른쪽 마진 증가
    const width = viewBoxWidth - margin.left - margin.right;
    const height = viewBoxHeight - margin.top - margin.bottom;
    
    svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
       .attr('preserveAspectRatio', 'xMidYMid meet')
       .style('width', '100%')
       .style('height', '500px')
       .style('border', '1px solid #ddd')
       .style('border-radius', '4px')
       .style('background', '#fafafa');
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // 스케일 설정
    const yScale = d3.scaleBand()
      .domain(data.map(d => d.category))
      .range([0, height])
      .padding(0.1);
    
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.original)])
      .nice()
      .range([0, width]);
    
    // 축 그리기
    g.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(d => {
          const twh = d / 1000000000; // kWh를 TWh로 변환
          if (twh >= 1) return twh.toFixed(1) + 'T';
          return (twh * 1000).toFixed(0) + 'G';
        })
      )
      .selectAll('text')
      .style('font-size', '10px');
    
    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('font-size', '9px')
      .call(wrap, margin.left - 10);
    
    // 감축 이후 사용량 (선명한 바)
    const afterBars = g.selectAll('.after-bar')
      .data(data)
      .enter().append('rect')
      .attr('class', 'after-bar')
      .attr('x', 0)
      .attr('y', d => yScale(d.category))
      .attr('width', d => xScale(d.afterReduction))
      .attr('height', yScale.bandwidth())
      .attr('fill', '#2196F3')
      .attr('stroke', 'none')
      .attr('stroke-width', 0)
      .style('cursor', 'pointer');
    
    // 감축된 부분 (연한 바)
    const reductionBars = g.selectAll('.reduction-bar')
      .data(data)
      .enter().append('rect')
      .attr('class', 'reduction-bar')
      .attr('x', d => xScale(d.afterReduction))
      .attr('y', d => yScale(d.category))
      .attr('width', d => xScale(d.reductionAmount))
      .attr('height', yScale.bandwidth())
      .attr('fill', '#2196F3')
      .attr('opacity', 0.3)
      .attr('stroke', 'none')
      .attr('stroke-width', 0)
      .style('cursor', 'pointer');
    
    // 호버 이벤트
    const allBars = g.selectAll('.after-bar, .reduction-bar');
    
    allBars
      .on('mouseover', function(event, d) {
        // 다른 바들 연하게 (색 차이 유지)
        afterBars.filter(bar => bar.category !== d.category)
          .transition().duration(200)
          .attr('fill', '#90CAF9')  // 연한 파란색
          .attr('stroke', 'none');
        
        reductionBars.filter(bar => bar.category !== d.category)
          .transition().duration(200)
          .attr('fill', '#90CAF9')  // 연한 파란색
          .attr('opacity', 0.2);   // 더 연하게
        
        // 현재 카테고리의 바들 강조 (색 차이 유지하면서 테두리 추가)
        afterBars.filter(bar => bar.category === d.category)
          .transition().duration(200)
          .attr('fill', '#1976D2')  // 더 진한 파란색
          .attr('stroke', '#0D47A1') // 진한 테두리
          .attr('stroke-width', 2);
        
        reductionBars.filter(bar => bar.category === d.category)
          .transition().duration(200)
          .attr('fill', '#1976D2')  // 더 진한 파란색
          .attr('opacity', 0.4)     // 약간 더 진하게
          .attr('stroke', '#0D47A1') // 진한 테두리
          .attr('stroke-width', 2);
        
        // 툴팁 생성
        const tooltip = d3.select('body').append('div')
          .attr('class', 'chart-tooltip')
          .style('opacity', 0)
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.9)')
          .style('color', 'white')
          .style('padding', '12px')
          .style('border-radius', '6px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('z-index', '3000')
          .style('max-width', '300px')
          .style('line-height', '1.4');
        
        tooltip.transition()
          .duration(200)
          .style('opacity', 1);
        
        const formatNumber = (num) => {
          const twh = num / 1000000000; // kWh를 TWh로 변환 (1e9)
          if (twh >= 1) return twh.toFixed(2) + ' TWh';
          return (twh * 1000).toFixed(1) + ' GWh';
        };
        
        tooltip.html(`
          <div><strong>${d.category}</strong></div>
          <div>원래 사용량: ${formatNumber(d.original)}</div>
          <div>감축 후 사용량: ${formatNumber(d.afterReduction)}</div>
          <div>감축 가능량: ${formatNumber(d.reductionAmount)}</div>
          <div>감축률: ${d.reductionRate}%</div>
          <div style="margin-top: 8px; border-top: 1px solid #555; padding-top: 8px;">
            <strong>감축 방법:</strong><br>${d.description}
          </div>
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        // 모든 바 원래 색상과 투명도로 복원
        afterBars.transition().duration(200)
          .attr('fill', '#2196F3')
          .attr('stroke', 'none')
          .attr('stroke-width', 0);
        
        reductionBars.transition().duration(200)
          .attr('fill', '#2196F3')
          .attr('opacity', 0.3)
          .attr('stroke', 'none')
          .attr('stroke-width', 0);
        
        // 툴팁 제거
        d3.selectAll('.chart-tooltip').remove();
      });
    
    // x축 레이블
    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 35)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', '#666')
      .text('전력 사용량 (TWh)');
    
    // 범례 - 차트 오른쪽으로 이동
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${margin.left + width + 20}, ${margin.top + 20})`);
    
    legend.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 15)
      .attr('height', 10)
      .attr('fill', '#2196F3');
    
    legend.append('text')
      .attr('x', 20)
      .attr('y', 8)
      .style('font-size', '10px')
      .style('fill', '#333')
      .text('감축 후 사용량');
    
    legend.append('rect')
      .attr('x', 0)
      .attr('y', 20)
      .attr('width', 15)
      .attr('height', 10)
      .attr('fill', '#2196F3')
      .attr('opacity', 0.3);
    
    legend.append('text')
      .attr('x', 20)
      .attr('y', 28)
      .style('font-size', '10px')
      .style('fill', '#333')
      .text('감축 가능량');
    
    // 차트 제목
    g.append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('fill', '#333')
      .text('전력 감축 가능량 (2025년 3월 기준)');
  };

  // 텍스트 줄바꿈 함수
  function wrap(text, width) {
    text.each(function() {
      var text = d3.select(this),
          words = text.text().split(/\s+/).reverse(),
          word,
          line = [],
          lineNumber = 0,
          lineHeight = 1.1,
          y = text.attr("y"),
          dy = parseFloat(text.attr("dy")) || 0,
          tspan = text.text(null).append("tspan").attr("x", -5).attr("y", y).attr("dy", dy + "em");
      
      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(""));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(""));
          line = [word];
          tspan = text.append("tspan").attr("x", -5).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
        }
      }
    });
  }

  if (!showPopup) return null;

  return (
    <div className="energy-popup-overlay" onClick={onClose}>
      <div className="energy-popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh' }}>
        <button 
          className="energy-popup-close" 
          onClick={onClose}
        >
          ×
        </button>
        
        <h3 className="energy-popup-title">발전 예산 계산 시 고려할 점</h3>
        
        <div className="energy-popup-content">
          <p>
            <strong>발전 예산 시뮬레이션</strong>은 특정 전력 수요를 충족하기 위해 필요한 <strong>총 발전 비용</strong>을 계산하는 도구입니다.
          </p>
          
          <h4>시뮬레이션 방법:</h4>
          <div className="list-container">
            <ol>
              <li><strong>필요 전력량</strong> 입력 (GWh 단위)</li>
              <li><strong>발전원 비율</strong> 조정 (화석연료, 원자력, 신재생, 수력)</li>
              <li><strong>각 발전원별 단가</strong>를 적용하여 총 발전 비용 계산</li>
            </ol>
          </div>
          
          <p className="formula-box">
            총 발전 비용 = Σ(발전량 × 발전원 비율 × 발전 단가)
          </p>
          
          <h4>발전 예산 계산 시 고려사항:</h4>
          <div className="list-container">
            <ul>
              <li><strong>발전원별 단가 차이:</strong> 건설비, 연료비, 운영비, 환경비용</li>
              <li><strong>설비 가동률:</strong> 원자력(고정), 화석연료(조절), 신재생(변동)</li>
              <li><strong>연료 가격 변동성:</strong> 국제 에너지 시장 불안정성</li>
              <li><strong>환경 규제 비용:</strong> 탄소배출권, 환경오염 처리비용</li>
              <li><strong>전력 수요 변화:</strong> 산업별 감축 정책 및 전력 예비량 확보</li>
            </ul>
          </div>
          
          <h4>2024년 에너지원별 단가 동향:</h4>
          <p>
            발전 예산 계산 시 에너지원별 단가 변동을 고려해야 합니다. 
            <strong> 화석연료는 국제 시장 상황에 따라 큰 변동성</strong>을 보이는 반면, 
            <strong> 원자력과 신재생에너지는 상대적으로 안정적</strong>인 단가를 유지합니다.
          </p>
          
          <div className="chart-container">
            <svg ref={priceChartRef}></svg>
          </div>

          <div className="tip-box">
            💡 <strong>신재생에너지 경제성:</strong> 신재생에너지는 초기 투자비가 높지만 
            연료비가 없어 장기적으로 발전 비용을 절감할 수 있습니다. 
            또한 탄소중립 정책과 환경 규제 강화로 인해 미래 경제성이 더욱 향상될 전망입니다.
          </div>
          
          <h4>최소 필요 전력량 산정:</h4>
          <p>
            발전 예산을 정확히 계산하기 위해서는 단순한 전력 수요량이 아닌, 
            <strong>산업별 전력 감축 정책과 전력 예비량을 고려한 최소 필요 전력량</strong>을 먼저 파악해야 합니다.
          </p>
          
          <div className="chart-container">
            <svg ref={chartRef}></svg>
          </div>
          
          <p>
            위 차트는 2025년 3월 기준 한국의 산업별 전력 감축 가능량으로,
            이에 의하면 <strong>전체 전력의 15%</strong>를 감축할 수 있습니다.
            이러한 감축 가능 정도를 반영하여 실제 필요한 최소 전력량을 산정한 후, 
            여기에 전력 예비량(15-20%)을 추가하여 총 발전 계획을 수립해야 합니다.
          </p>
          
          {/* <div className="tip-box">
            💡 <strong>신재생에너지 경제성:</strong> 신재생에너지는 초기 투자비가 높지만 
            연료비가 없어 장기적으로 발전 비용을 절감할 수 있습니다. 
            또한 탄소중립 정책과 환경 규제 강화로 인해 미래 경제성이 더욱 향상될 전망입니다.
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default PopupEnergyBudget;
