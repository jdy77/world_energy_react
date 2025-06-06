import React from 'react';
import '../css/popupbackup.css';

const InfoPopup = ({ showPopup, onClose }) => {
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
        
        <h3 className="info-popup-title">전력예비량이란?</h3>
        
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
          
          <div className="highlight-box">
            <strong>생산량이 더 많은 소비량</strong>인 이유: 
            전력은 저장이 어려워 실시간으로 생산과 소비의 균형을 맞춰야 하며, 
            안정적인 전력 공급을 위해 항상 여유분을 확보해야 하기 때문입니다.
          </div>
          
          <h4>전력예비량의 활용</h4>
          <ul>
            <li>피크 시간대 전력 수요 충족</li>
            <li>발전소 정기점검 시 전력 공급 유지</li>
            <li>전력 수출을 통한 에너지 외교</li>
            <li>신재생에너지 변동성 보완</li>
          </ul>
          
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
