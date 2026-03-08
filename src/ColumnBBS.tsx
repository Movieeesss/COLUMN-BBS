import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Unit weight formula: (D^2 / 162)
const getWeight = (dia: number) => (dia * dia) / 162;

interface ColumnEntry {
  id: string;
  name: string;
  width: string;
  depth: string;
  diaCorner: number;
  numCorner: string;
  diaExtra: number;
  numExtra: string;
  diaTies: number;
  spacing: string;
  height: string;
  numColumns: string; // "No. of Columns as per Structural drawings"
}

const ColumnBBS: React.FC = () => {
  const [columns, setColumns] = useState<ColumnEntry[]>([
    { 
      id: '1', name: 'C1', width: '230', depth: '380', 
      diaCorner: 16, numCorner: '4', 
      diaExtra: 12, numExtra: '2', 
      diaTies: 8, spacing: '6', height: '11', numColumns: '3' 
    }
  ]);

  const updateCol = (id: string, field: keyof ColumnEntry, val: any) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c));
  };

  const addNewColumn = () => {
    const nextId = (columns.length + 1).toString();
    setColumns([...columns, { ...columns[0], id: nextId, name: `C${nextId}` }]);
  };

  // --- CALCULATION ENGINE (Excel-Matched Logic) ---
  const results = useMemo(() => {
    const diaTotals: Record<number, number> = {};
    let grandTotalKg = 0;

    const detailed = columns.map(col => {
      const nCols = parseFloat(col.numColumns) || 0;
      const h = parseFloat(col.height) || 0;
      const s = parseFloat(col.spacing) || 1;
      const w = parseFloat(col.width) || 0;
      const d = parseFloat(col.depth) || 0;
      const hM = h * 0.3048;

      // Excel Logic: (Height * Num Bars * Unit Weight * No. of Columns)
      const cornerKg = hM * (parseFloat(col.numCorner) || 0) * getWeight(col.diaCorner) * nCols;
      const extraKg = hM * (parseFloat(col.numExtra) || 0) * getWeight(col.diaExtra) * nCols;

      // Ties Logic: (Perimeter with Hooks * Total No. of Ties * No. of Columns)
      const tieLen = (((w - 80) * 2) + ((d - 80) * 2) + 200) / 1000;
      const nTies = (Math.ceil((h * 12) / s) + 1) * nCols;
      const tiesKg = tieLen * nTies * getWeight(col.diaTies);

      const subTotal = cornerKg + extraKg + tiesKg;
      grandTotalKg += subTotal;

      // Update diameter summary
      [ [col.diaCorner, cornerKg], [col.diaExtra, extraKg], [col.diaTies, tiesKg] ].forEach(([dia, kg]) => {
        diaTotals[dia] = (diaTotals[dia] || 0) + kg;
      });

      return { ...col, subTotal, nTies };
    });

    return { detailed, diaTotals, grandTotalKg };
  }, [columns]);

  // --- PDF GENERATOR (C1, C2 Breakdown) ---
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text("COLUMN BBS SUMMARY REPORT", 14, 15);
    
    const rows = results.detailed.map(c => [
      c.name, `${c.width}x${c.depth}`, `${c.diaCorner}mm(${c.numCorner})`, 
      `${c.diaExtra}mm(${c.numExtra})`, c.numColumns, `${c.subTotal.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['Name', 'Size', 'Corner', 'Extra', 'No. of Cols', 'Total KG']],
      body: rows,
      headStyles: { fillColor: [139, 195, 74] } // Green
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Final Diameter Summary', 'Total Weight (KG)']],
      body: Object.entries(results.diaTotals).map(([d, kg]) => [`${d}mm Steel`, `${kg.toFixed(2)} KG`]),
      headStyles: { fillColor: [3, 169, 244] } // Blue
    });

    doc.save("Column_BBS_Report.pdf");
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans pb-10">
      {/* Header Bar */}
      <div className="bg-[#8bc34a] p-4 text-center shadow-md border-b-2 border-black/10">
        <h1 className="text-black font-bold text-xl uppercase tracking-tighter">Column BBS Calculator</h1>
      </div>

      <div className="p-3 space-y-6">
        {results.detailed.map((col) => (
          <div key={col.id} className="bg-[#03a9f4] rounded-2xl shadow-xl overflow-hidden border-b-8 border-[#0288d1]">
            <div className="bg-[#0288d1] px-4 py-2 flex justify-between items-center text-white font-bold text-xs uppercase">
              <span>Editable Data - {col.name}</span>
              <button onClick={() => setColumns(columns.filter(i => i.id !== col.id))} className="bg-red-500 rounded-full w-6 h-6 flex items-center justify-center">✕</button>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <UIInput label="Width (mm)" value={col.width} onChange={v => updateCol(col.id, 'width', v)} />
                <UIInput label="Depth (mm)" value={col.depth} onChange={v => updateCol(col.id, 'depth', v)} />
              </div>

              <div className="flex gap-2">
                <UISelect label="Dia Corner" value={col.diaCorner} onChange={v => updateCol(col.id, 'diaCorner', v)} options={[12, 16, 20, 25]} />
                <UIInput label="Corner Nos" value={col.numCorner} onChange={v => updateCol(col.id, 'numCorner', v)} />
              </div>

              <div className="flex gap-2">
                <UISelect label="Dia Extra" value={col.diaExtra} onChange={v => updateCol(col.id, 'diaExtra', v)} options={[10, 12, 16, 20]} />
                <UIInput label="Extra Nos" value={col.numExtra} onChange={v => updateCol(col.id, 'numExtra', v)} />
              </div>

              <div className="flex gap-2">
                <UIInput label="Height (Ft)" value={col.height} onChange={v => updateCol(col.id, 'height', v)} />
                <UIInput label="No. of Columns" value={col.numColumns} onChange={v => updateCol(col.id, 'numColumns', v)} />
              </div>
            </div>

            {/* Visual Bars like Footing BBS */}
            <div className="bg-[#ffff00] p-3 text-center font-bold text-gray-800 border-t border-black/10">
              {col.name} WEIGHT: {col.subTotal.toFixed(2)} KG
            </div>
          </div>
        ))}

        {/* Steel Consumption Summary Card */}
        <div className="bg-white rounded-2xl border-2 border-[#03a9f4] p-5 shadow-inner">
          <h2 className="text-center font-black text-[#0288d1] border-b-2 border-sky-100 pb-2 mb-4 uppercase">Steel Consumption Summary</h2>
          {Object.entries(results.diaTotals).map(([dia, kg]) => (
            <div key={dia} className="flex justify-between py-2 border-b border-dotted border-gray-300 font-bold text-sm">
              <span className="text-[#03a9f4]">{dia}mm Steel:</span>
              <span>{kg.toFixed(2)} KG</span>
            </div>
          ))}
          <div className="mt-5 bg-[#8bc34a] p-4 rounded-xl text-center font-black text-black text-lg shadow-md">
            GRAND TOTAL: {results.grandTotalKg.toFixed(2)} KG
          </div>
        </div>

        {/* Footer Buttons */}
        <button onClick={addNewColumn} className="w-full bg-[#0288d1] text-white font-black py-4 rounded-xl shadow-lg uppercase active:scale-95 transition-all">
          + Add New Column (C{columns.length + 1})
        </button>
        <button onClick={generatePDF} className="w-full bg-[#212121] text-white font-black py-4 rounded-xl shadow-lg uppercase active:scale-95 transition-all">
          Generate Summary PDF
        </button>
      </div>
    </div>
  );
};

// --- COLORFUL UI HELPERS ---
const UIInput = ({ label, value, onChange }: any) => (
  <div className="flex-1 bg-[#4fc3f7] rounded-xl p-2 border border-white/20">
    <label className="text-white text-[9px] font-black block uppercase mb-1">{label}</label>
    <input 
      type="number" 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      className="w-full bg-white rounded-lg p-2 text-center font-bold text-gray-700 outline-none" 
    />
  </div>
);

const UISelect = ({ label, value, onChange, options }: any) => (
  <div className="flex-1 bg-[#4fc3f7] rounded-xl p-2 border border-white/20">
    <label className="text-white text-[9px] font-black block uppercase mb-1">{label}</label>
    <select 
      value={value} 
      onChange={e => onChange(Number(e.target.value))} 
      className="w-full bg-white rounded-lg p-2 font-bold text-gray-700 outline-none appearance-none text-center"
    >
      {options.map((o: any) => <option key={o} value={o}>{o}mm</option>)}
    </select>
  </div>
);

export default ColumnBBS;
