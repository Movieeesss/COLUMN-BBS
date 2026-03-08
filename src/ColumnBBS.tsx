import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Unit weight: (D^2 / 162)
const getWeight = (dia: number) => (dia * dia) / 162;

interface ColumnData {
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
}

const ColumnBBS: React.FC = () => {
  const [columns, setColumns] = useState<ColumnData[]>([
    { id: '1', name: 'C1', width: '230', depth: '380', diaCorner: 16, numCorner: '4', diaExtra: 12, numExtra: '2', diaTies: 8, spacing: '6', height: '11' }
  ]);

  // Handle Input Changes without Lag
  const updateColumn = (id: string, field: keyof ColumnData, value: any) => {
    setColumns(prev => prev.map(col => col.id === id ? { ...col, [field]: value } : col));
  };

  const addNewColumn = () => {
    const newId = (columns.length + 1).toString();
    setColumns([...columns, { ...columns[0], id: newId, name: `C${newId}` }]);
  };

  // --- CALCULATION ENGINE ---
  const results = useMemo(() => {
    let grandTotal = 0;
    const diaSummary: Record<number, number> = {};

    const detailedCols = columns.map(col => {
      const h = parseFloat(col.height) || 0;
      const s = parseFloat(col.spacing) || 1;
      const w = parseFloat(col.width) || 0;
      const d = parseFloat(col.depth) || 0;
      const nc = parseFloat(col.numCorner) || 0;
      const ne = parseFloat(col.numExtra) || 0;
      const heightM = h * 0.3048;

      const cornerKg = heightM * nc * getWeight(col.diaCorner);
      const extraKg = heightM * ne * getWeight(col.diaExtra);
      
      const tieLen = (((w - 80) * 2) + ((d - 80) * 2) + 200) / 1000;
      const numTies = Math.ceil((h * 12) / s) + 1;
      const tiesKg = tieLen * numTies * getWeight(col.diaTies);

      const total = cornerKg + extraKg + tiesKg;
      grandTotal += total;

      // Group by Diameter for Final Summary
      [ [col.diaCorner, cornerKg], [col.diaExtra, extraKg], [col.diaTies, tiesKg] ].forEach(([dia, weight]) => {
        diaSummary[dia] = (diaSummary[dia] || 0) + weight;
      });

      return { ...col, cornerKg, extraKg, tiesKg, total, numTies };
    });

    return { detailedCols, grandTotal, diaSummary };
  }, [columns]);

  // --- PDF GENERATOR (Fixed Errors) ---
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("COLUMN BBS SUMMARY REPORT", 14, 15);
    
    const tableData = results.detailedCols.map(c => [
      c.name, `${c.width}x${c.depth}`, `${c.diaCorner}mm (${c.numCorner}#)`, `${c.diaExtra}mm (${c.numExtra}#)`, `${c.diaTies}mm @${c.spacing}"`, `${c.total.toFixed(2)} KG`
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['Type', 'Size', 'Corner', 'Extra', 'Ties', 'Total Weight']],
      body: tableData,
      headStyles: { fillColor: [139, 195, 74] }
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Diameter Summary', 'Total Weight (KG)']],
      body: Object.entries(results.diaSummary).map(([dia, kg]) => [`${dia}mm Steel`, kg.toFixed(2)]),
      headStyles: { fillColor: [3, 169, 244] }
    });

    doc.save("Column_BBS_Summary.pdf");
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-10">
      <div className="bg-[#8bc34a] p-4 text-center shadow-md">
        <h1 className="text-black font-bold text-xl uppercase">Column BBS Calculator</h1>
      </div>

      <div className="p-3 space-y-6">
        {results.detailedCols.map((col) => (
          <div key={col.id} className="bg-[#03a9f4] rounded-2xl shadow-xl overflow-hidden border-b-8 border-[#0288d1]">
            <div className="bg-[#0288d1] px-4 py-2 flex justify-between items-center text-white font-bold">
              <span>EDITABLE DATA - {col.name}</span>
              <button onClick={() => setColumns(columns.filter(c => c.id !== col.id))} className="bg-red-500 rounded-full w-6 h-6">✕</button>
            </div>

            <div className="p-4 space-y-2">
              <div className="flex gap-2">
                <InputBox label="Width" value={col.width} onChange={v => updateColumn(col.id, 'width', v)} />
                <InputBox label="Depth" value={col.depth} onChange={v => updateColumn(col.id, 'depth', v)} />
              </div>
              <div className="flex gap-2">
                <SelectBox label="Dia Corner" value={col.diaCorner} onChange={v => updateColumn(col.id, 'diaCorner', v)} options={[12, 16, 20, 25]} />
                <InputBox label="Nos" value={col.numCorner} onChange={v => updateColumn(col.id, 'numCorner', v)} />
              </div>
              <div className="flex gap-2">
                <SelectBox label="Dia Extra" value={col.diaExtra} onChange={v => updateColumn(col.id, 'diaExtra', v)} options={[10, 12, 16, 20]} />
                <InputBox label="Nos" value={col.numExtra} onChange={v => updateColumn(col.id, 'numExtra', v)} />
              </div>
              <InputBox label="Ties Spacing (Inch)" value={col.spacing} onChange={v => updateColumn(col.id, 'spacing', v)} />
              <InputBox label="Height (Ft)" value={col.height} onChange={v => updateColumn(col.id, 'height', v)} />
            </div>

            <div className="bg-[#ffff00] p-3 text-center font-bold text-gray-800">
              TOTAL WEIGHT: {col.total.toFixed(2)} KG
            </div>
          </div>
        ))}

        {/* FINAL SUMMARY (Modelled after Footing BBS) */}
        <div className="bg-white rounded-2xl border-4 border-[#03a9f4] p-5 shadow-lg">
          <h2 className="text-center font-black text-[#0288d1] border-b-2 mb-4 uppercase">Steel Consumption Summary</h2>
          {Object.entries(results.diaSummary).map(([dia, kg]) => (
            <div key={dia} className="flex justify-between py-2 border-b border-dotted font-bold">
              <span className="text-blue-600">{dia}mm Steel:</span>
              <span>{kg.toFixed(2)} KG</span>
            </div>
          ))}
          <div className="mt-4 text-center bg-[#8bc34a] p-3 rounded-xl font-black text-white text-xl">
            GRAND TOTAL: {results.grandTotal.toFixed(2)} KG
          </div>
        </div>

        <button onClick={addNewColumn} className="w-full bg-[#0288d1] text-white font-bold py-4 rounded-xl shadow-lg uppercase active:scale-95 transition-transform">
          + Add New Column (C{columns.length + 1})
        </button>
        <button onClick={generatePDF} className="w-full bg-[#212121] text-white font-bold py-4 rounded-xl shadow-lg uppercase active:scale-95 transition-transform">
          Generate Summary PDF
        </button>
      </div>
    </div>
  );
};

// --- SMALL UI HELPERS ---
const InputBox = ({ label, value, onChange }: any) => (
  <div className="flex-1 bg-[#4fc3f7] rounded-xl p-2">
    <label className="text-white text-[10px] font-bold block uppercase">{label}</label>
    <input type="number" value={value} onChange={e => onChange(e.target.value)} className="w-full bg-white rounded p-1 text-center font-bold outline-none" />
  </div>
);

const SelectBox = ({ label, value, onChange, options }: any) => (
  <div className="flex-1 bg-[#4fc3f7] rounded-xl p-2">
    <label className="text-white text-[10px] font-bold block uppercase">{label}</label>
    <select value={value} onChange={e => onChange(Number(e.target.value))} className="w-full bg-white rounded p-1 font-bold outline-none">
      {options.map((opt: any) => <option key={opt} value={opt}>{opt}mm</option>)}
    </select>
  </div>
);

export default ColumnBBS;
