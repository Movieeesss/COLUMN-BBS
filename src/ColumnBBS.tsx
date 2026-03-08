import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Unit weight formula: (D^2 / 162)
const getWeight = (dia: number) => (dia * dia) / 162;

const ColumnBBS: React.FC = () => {
  // --- STATE (Strings for lag-free typing) ---
  const [colSizeW, setColSizeW] = useState<string>("230");
  const [colSizeD, setColSizeD] = useState<string>("380");
  const [diaCorner, setDiaCorner] = useState<number>(16);
  const [diaExtra, setDiaExtra] = useState<number>(12);
  const [diaTies, setDiaTies] = useState<number>(8);
  const [spacingInch, setSpacingInch] = useState<string>("6");
  const [heightFt, setHeightFt] = useState<string>("11");
  
  // Fixed Counts from Excel Data
  const countCorner = 4;
  const countExtra = 2;
  const clearCover = 40; // mm

  // --- CALCULATION ENGINE ---
  const calc = useMemo(() => {
    const h = parseFloat(heightFt) || 0;
    const s = parseFloat(spacingInch) || 1;
    const w = parseFloat(colSizeW) || 0;
    const d = parseFloat(colSizeD) || 0;
    const heightM = h * 0.3048;

    // 1. Main Bars
    const cornerKg = heightM * countCorner * getWeight(diaCorner);
    const extraKg = heightM * countExtra * getWeight(diaExtra);

    // 2. Ties (Stirrups) Logic
    const tieLengthM = (((w - 2 * clearCover) * 2) + ((d - 2 * clearCover) * 2) + 200) / 1000;
    const numTies = Math.ceil((h * 12) / s) + 1;
    const tiesKg = tieLengthM * numTies * getWeight(diaTies);

    const totalKg = cornerKg + extraKg + tiesKg;

    return {
      cornerKg: cornerKg.toFixed(2),
      extraKg: extraKg.toFixed(2),
      tiesKg: tiesKg.toFixed(2),
      totalKg: totalKg.toFixed(2),
      numTies: numTies
    };
  }, [heightFt, spacingInch, colSizeW, colSizeD, diaCorner, diaExtra, diaTies]);

  // --- PDF GENERATOR ---
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("COLUMN BBS SUMMARY REPORT", 14, 20);
    
    autoTable(doc, {
      startY: 30,
      head: [['Description', 'Size/Dia', 'Qty/Spacing', 'Weight (KG)']],
      body: [
        ['Corner Bars', `${diaCorner}mm`, `${countCorner} Nos`, calc.cornerKg],
        ['Extra Bars', `${diaExtra}mm`, `${countExtra} Nos`, calc.extraKg],
        ['Column Ties', `${diaTies}mm`, `${spacingInch}" c/c`, calc.tiesKg],
        ['TOTAL WEIGHT', '-', '-', `${calc.totalKg} KG`]
      ],
      headStyles: { fillColor: [139, 195, 74], textColor: [0, 0, 0] },
      styles: { fontStyle: 'bold' }
    });

    doc.save(`Column_T1_Report.pdf`);
  };

  return (
    <div className="min-h-screen bg-white font-sans pb-10">
      {/* Header - Green Theme */}
      <div className="bg-[#8bc34a] p-4 text-center shadow-md">
        <h1 className="text-black font-bold text-xl uppercase">Column BBS Calculator</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Main Editable Card - Blue Theme */}
        <div className="bg-[#03a9f4] rounded-2xl shadow-xl overflow-hidden border-b-8 border-[#0288d1]">
          <div className="bg-[#0288d1] px-4 py-2 flex justify-between items-center text-white font-bold text-xs">
            <span>EDITABLE DATA - T1</span>
            <span className="bg-red-500 rounded-full w-5 h-5 flex items-center justify-center">✕</span>
          </div>

          <div className="p-4 space-y-2">
            <InputItem label="Width (mm)" value={colSizeW} onChange={setColSizeW} />
            <InputItem label="Depth (mm)" value={colSizeD} onChange={setColSizeD} />
            
            <div className="flex items-center bg-[#4fc3f7] rounded-xl p-2">
              <span className="text-white font-bold flex-1 px-2 text-sm uppercase">Dia Corner</span>
              <select value={diaCorner} onChange={(e) => setDiaCorner(Number(e.target.value))} className="w-28 p-2 rounded-lg font-bold outline-none">
                {[12, 16, 20, 25].map(d => <option key={d} value={d}>{d}mm</option>)}
              </select>
            </div>

            <div className="flex items-center bg-[#4fc3f7] rounded-xl p-2">
              <span className="text-white font-bold flex-1 px-2 text-sm uppercase">Dia Extra</span>
              <select value={diaExtra} onChange={(e) => setDiaExtra(Number(e.target.value))} className="w-28 p-2 rounded-lg font-bold outline-none">
                {[10, 12, 16, 20].map(d => <option key={d} value={d}>{d}mm</option>)}
              </select>
            </div>

            <InputItem label="Ties Spacing (Inch)" value={spacingInch} onChange={setSpacingInch} />
            <InputItem label="Height (Ft)" value={heightFt} onChange={setHeightFt} />
          </div>

          {/* Yellow Bar */}
          <div className="bg-[#ffff00] p-3 flex justify-between items-center px-6 font-bold text-gray-800">
            <span>TOTAL BARS</span>
            <span>{6 + calc.numTies} Nos</span>
          </div>

          {/* Green Weight Bar */}
          <div className="bg-[#8bc34a] p-4 flex justify-between items-center px-6 font-black text-gray-900">
            <span className="italic">TOTAL WEIGHT</span>
            <span className="text-xl">{calc.totalKg} KG</span>
          </div>
        </div>

        {/* Consumption Summary Section */}
        <div className="bg-white rounded-2xl border-2 border-[#03a9f4] p-5 shadow-sm">
          <h3 className="text-center font-bold text-gray-700 border-b-2 border-sky-100 pb-2 mb-4 uppercase text-sm">Summary</h3>
          <div className="space-y-3">
            <SummaryRow label={`${diaCorner}mm Corner (4 Nos)`} value={calc.cornerKg} />
            <SummaryRow label={`${diaExtra}mm Extra (2 Nos)`} value={calc.extraKg} />
            <SummaryRow label={`${diaTies}mm Ties (${calc.numTies} Nos)`} value={calc.tiesKg} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button className="w-full bg-[#0288d1] text-white font-bold py-4 rounded-xl shadow-lg uppercase text-sm active:scale-95 transition-transform">+ Add New Column</button>
          <button onClick={generatePDF} className="w-full bg-[#212121] text-white font-bold py-4 rounded-xl shadow-lg uppercase text-sm active:scale-95 transition-transform">Generate Summary PDF</button>
        </div>
      </div>
    </div>
  );
};

// Sub-components
const InputItem = ({ label, value, onChange }: any) => (
  <div className="flex items-center bg-[#4fc3f7] rounded-xl p-2">
    <span className="text-white font-bold flex-1 px-2 text-sm uppercase">{label}</span>
    <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="w-28 p-2 rounded-lg text-center font-bold outline-none" />
  </div>
);

const SummaryRow = ({ label, value }: any) => (
  <div className="flex justify-between border-b border-dotted pb-1">
    <span className="text-[#0288d1] font-bold text-sm">{label}:</span>
    <span className="font-bold text-gray-800">{value} KG</span>
  </div>
);

export default ColumnBBS;
