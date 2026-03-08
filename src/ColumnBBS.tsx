import React, { useState, useMemo } from 'react';

// Unit weight calculation: (D^2 / 162)
const calcUnitWeight = (dia: number) => (dia * dia) / 162;

const ColumnBBS: React.FC = () => {
  // --- STATE MANAGEMENT (Inputs from your Excel) ---
  const [colWidth, setColWidth] = useState<number>(230); // mm
  const [colDepth, setColDepth] = useState<number>(300); // mm
  const [heightFt, setHeightFt] = useState<number>(11);
  const [ratePerKg, setRatePerKg] = useState<number>(80);

  // Main Reinforcement
  const [diaCorner, setDiaCorner] = useState<number>(12);
  const [numCorner, setNumCorner] = useState<number>(4);
  const [diaExtra, setDiaExtra] = useState<number>(12);
  const [numExtra, setNumExtra] = useState<number>(2);

  // Lateral Ties (Stirrups)
  const [diaTies, setDiaTies] = useState<number>(8);
  const [spacingInch, setSpacingInch] = useState<number>(6);
  const [clearCover, setClearCover] = useState<number>(40); // Standard 40mm

  // --- CALCULATION ENGINE (Memoized for Performance) ---
  const data = useMemo(() => {
    const heightM = heightFt * 0.3048;
    
    // 1. Main Bars Calculation
    const weightCorner = heightM * numCorner * calcUnitWeight(diaCorner);
    const weightExtra = heightM * numExtra * calcUnitWeight(diaExtra);

    // 2. Ties Calculation (Based on Excel 'Ties Length' logic)
    // Perimeter - Cover + Hooks (simplified for 90/135 deg)
    const tieLengthM = (((colWidth - 2 * clearCover) * 2) + ((colDepth - 2 * clearCover) * 2) + 200) / 1000;
    const numTies = Math.ceil((heightFt * 12) / spacingInch) + 1;
    const weightTies = tieLengthM * numTies * calcUnitWeight(diaTies);

    const totalWeight = weightCorner + weightExtra + weightTies;

    return {
      cornerWeight: weightCorner.toFixed(2),
      extraWeight: weightExtra.toFixed(2),
      tiesWeight: weightTies.toFixed(2),
      totalKg: totalWeight.toFixed(2),
      totalCost: Math.round(totalWeight * ratePerKg)
    };
  }, [colWidth, colDepth, heightFt, diaCorner, numCorner, diaExtra, numExtra, diaTies, spacingInch, ratePerKg]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-10">
      {/* Header Area */}
      <div className="bg-[#8bc34a] p-4 text-center shadow-md">
        <h1 className="text-white font-black text-xl tracking-wider">COLUMN BBS CALCULATOR</h1>
      </div>

      <div className="p-3 space-y-4">
        {/* EDITABLE DATA CARD */}
        <div className="bg-[#03a9f4] rounded-xl shadow-lg overflow-hidden border-b-4 border-sky-700">
          <div className="bg-[#0288d1] px-4 py-2 flex justify-between items-center">
            <span className="text-white font-bold text-xs uppercase">Editable Data - T1</span>
            <button className="bg-red-500 text-white rounded-full w-5 h-5 text-[10px]">✕</button>
          </div>

          <div className="p-4 space-y-2">
            {/* Input Row: Column Size */}
            <InputRow label="Width (mm)" value={colWidth} onChange={setColWidth} />
            <InputRow label="Depth (mm)" value={colDepth} onChange={setColDepth} />
            
            {/* Select Row: Corner Bars */}
            <SelectRow 
              label="Dia. Corner Bars" 
              value={diaCorner} 
              onChange={setDiaCorner} 
              options={[12, 16, 20, 25]} 
            />
            
            {/* Select Row: Extra Bars */}
            <SelectRow 
              label="Dia. Extra Bars" 
              value={diaExtra} 
              onChange={setDiaExtra} 
              options={[12, 16, 20]} 
            />

            {/* Input Row: Spacing */}
            <InputRow label="Ties Spacing (Inch)" value={spacingInch} onChange={setSpacingInch} />
            
            {/* Input Row: Height */}
            <InputRow label="Height (Ft)" value={heightFt} onChange={setHeightFt} />
          </div>

          {/* Yellow Total Bar */}
          <div className="bg-[#ffff00] p-3 flex justify-between items-center font-black text-gray-800">
            <span>TOTAL WEIGHT</span>
            <span>{data.totalKg} KG</span>
          </div>
        </div>

        {/* SUMMARY CARD */}
        <div className="bg-white rounded-xl border-2 border-[#03a9f4] p-4 shadow-sm">
          <h2 className="text-center font-bold text-gray-700 border-b-2 border-sky-100 pb-2 mb-4">
            STEEL CONSUMPTION SUMMARY
          </h2>
          
          <SummaryLine label={`${diaCorner}mm Corner Steel`} value={data.cornerWeight} />
          <SummaryLine label={`${diaExtra}mm Extra Steel`} value={data.extraWeight} />
          <SummaryLine label={`${diaTies}mm Ties Steel`} value={data.tiesWeight} />

          <div className="mt-4 pt-4 border-t-2 border-gray-100 flex justify-between items-center">
            <span className="font-bold text-gray-600">TOTAL COST (₹{ratePerKg}/kg)</span>
            <span className="text-xl font-black text-green-600">₹ {data.totalCost.toLocaleString()}</span>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <button className="w-full bg-[#0288d1] text-white font-bold py-4 rounded-lg shadow-md active:bg-sky-800 transition-colors uppercase tracking-widest text-sm">
          + Add New Column Type
        </button>
        <button className="w-full bg-[#212121] text-white font-bold py-4 rounded-lg shadow-md active:bg-black transition-colors uppercase tracking-widest text-sm">
          Generate Summary PDF
        </button>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS FOR CLEANER CODE ---

const InputRow = ({ label, value, onChange }: any) => (
  <div className="flex items-center bg-[#4fc3f7] rounded-lg p-2 gap-2">
    <span className="text-white text-xs font-bold flex-1 uppercase">{label}</span>
    <input 
      type="number" 
      value={value} 
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      className="w-20 rounded p-1 text-center font-bold outline-none border-none text-gray-700"
    />
  </div>
);

const SelectRow = ({ label, value, onChange, options }: any) => (
  <div className="flex items-center bg-[#4fc3f7] rounded-lg p-2 gap-2">
    <span className="text-white text-xs font-bold flex-1 uppercase">{label}</span>
    <select 
      value={value} 
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-20 rounded p-1 text-center font-bold outline-none border-none text-gray-700 bg-white"
    >
      {options.map((opt: number) => <option key={opt} value={opt}>{opt}mm</option>)}
    </select>
  </div>
);

const SummaryLine = ({ label, value }: any) => (
  <div className="flex justify-between py-2 border-b border-dotted border-gray-300 last:border-0">
    <span className="text-[#0288d1] font-bold text-sm">{label}:</span>
    <span className="font-black text-gray-800">{value} KG</span>
  </div>
);

export default ColumnBBS;
