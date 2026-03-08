import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Unit weight formula: (D^2 / 162)
const getWeightPerMeter = (dia: number) => (dia * dia) / 162;

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
  numCols: string;
}

const ColumnBBS: React.FC = () => {
  const [columns, setColumns] = useState<ColumnData[]>([
    { 
      id: '1', name: 'C1', width: '230', depth: '380', 
      diaCorner: 16, numCorner: '4', 
      diaExtra: 12, numExtra: '2', 
      diaTies: 8, spacing: '6', height: '11', numCols: '1' 
    }
  ]);

  const updateCol = (id: string, field: keyof ColumnData, val: any) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c));
  };

  const addNewColumn = () => {
    const nextId = (columns.length + 1).toString();
    setColumns([...columns, { ...columns[0], id: nextId, name: `C${nextId}` }]);
  };

  // --- CALCULATION ENGINE (Excel-Matched + 50d Lap) ---
  const results = useMemo(() => {
    const diaSummary: Record<number, number> = {};
    let grandTotal = 0;

    const detailed = columns.map(col => {
      const nCols = parseFloat(col.numCols) || 0;
      const hFt = parseFloat(col.height) || 0;
      const sIn = parseFloat(col.spacing) || 1;
      const wMm = parseFloat(col.width) || 0;
      const dMm = parseFloat(col.depth) || 0;
      const heightM = hFt * 0.3048;

      // Lap Length Calculation (50 * Dia) in Meters
      const lapCornerM = (50 * col.diaCorner) / 1000;
      const lapExtraM = (50 * col.diaExtra) / 1000;

      // 1. Main Bars (Height + 50d Lap)
      const cornerKg = (heightM + lapCornerM) * (parseFloat(col.numCorner) || 0) * getWeightPerMeter(col.diaCorner) * nCols;
      const extraKg = (heightM + lapExtraM) * (parseFloat(col.numExtra) || 0) * getWeightPerMeter(col.diaExtra) * nCols;

      // 2. Stirrups (Ties) Calculation: (Perimeter - Cover + Hooks)
      const tieLengthM = (((wMm - 80) * 2) + ((dMm - 80) * 2) + 200) / 1000;
      const totalTiesPerCol = Math.ceil((hFt * 12) / sIn) + 1;
      const tiesKg = tieLengthM * (totalTiesPerCol * nCols) * getWeightPerMeter(col.diaTies);

      const subTotal = cornerKg + extraKg + tiesKg;
      grandTotal += subTotal;

      [[col.diaCorner, cornerKg], [col.diaExtra, extraKg], [col.diaTies, tiesKg]].forEach(([d, kg]) => {
        diaSummary[d] = (diaSummary[d] || 0) + kg;
      });

      return { ...col, subTotal };
    });

    return { detailed, diaSummary, grandTotal };
  }, [columns]);

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text("COLUMN BBS SUMMARY REPORT (50d Lap Included)", 14, 15);
    autoTable(doc, {
      startY: 25,
      head: [['Name', 'Size', 'Corner (50d)', 'Extra (50d)', 'Ties', 'Weight (KG)']],
      body: results.detailed.map(c => [
        c.name, `${c.width}x${c.depth}`, `${c.diaCorner}mm(${c.numCorner})`, 
        `${c.diaExtra}mm(${c.numExtra})`, `${c.diaTies}mm @${c.spacing}"`, c.subTotal.toFixed(2)
      ]),
      headStyles: { fillColor: [139, 195, 74] }
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Diameter Summary', 'Total Weight (KG)']],
      body: Object.entries(results.diaSummary).map(([d, kg]) => [`${d}mm Steel`, `${kg.toFixed(2)} KG`]),
      headStyles: { fillColor: [3, 169, 244] }
    });
    doc.save("Column_BBS_Report.pdf");
  };

  return (
    <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh', fontFamily: 'sans-serif', paddingBottom: '40px' }}>
      <div style={{ backgroundColor: '#8bc34a', padding: '15px', textAlign: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
        <h1 style={{ color: '#000', margin: 0, fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase' }}>Column BBS Calculator</h1>
      </div>

      <div style={{ padding: '12px' }}>
        {results.detailed.map(col => (
          <div key={col.id} style={{ backgroundColor: '#03a9f4', borderRadius: '20px', marginBottom: '20px', overflow: 'hidden', boxShadow: '0 5px 15px rgba(0,0,0,0.2)', borderBottom: '10px solid #0288d1' }}>
            <div style={{ backgroundColor: '#0288d1', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>
              <span>EDITABLE DATA - {col.name}</span>
              <button onClick={() => setColumns(columns.filter(i => i.id !== col.id))} style={{ backgroundColor: '#ff5252', border: 'none', color: '#fff', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '15px' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <UIInput label="Width (MM)" value={col.width} onChange={v => updateCol(col.id, 'width', v)} />
                <UIInput label="Depth (MM)" value={col.depth} onChange={v => updateCol(col.id, 'depth', v)} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <UISelect label="Dia Corner" value={col.diaCorner} onChange={v => updateCol(col.id, 'diaCorner', v)} options={[12, 16, 20, 25]} />
                <UIInput label="Corner Nos" value={col.numCorner} onChange={v => updateCol(col.id, 'numCorner', v)} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <UISelect label="Dia Extra" value={col.diaExtra} onChange={v => updateCol(col.id, 'diaExtra', v)} options={[10, 12, 16, 20]} />
                <UIInput label="Extra Nos" value={col.numExtra} onChange={v => updateCol(col.id, 'numExtra', v)} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <UISelect label="Dia Stirrups" value={col.diaTies} onChange={v => updateCol(col.id, 'diaTies', v)} options={[8, 10, 12]} />
                <UIInput label="Spacing (Inch)" value={col.spacing} onChange={v => updateCol(col.id, 'spacing', v)} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <UIInput label="Height (Ft)" value={col.height} onChange={v => updateCol(col.id, 'height', v)} />
                <UIInput label="No. of Columns" value={col.numCols} onChange={v => updateCol(col.id, 'numCols', v)} />
              </div>
            </div>

            <div style={{ backgroundColor: '#ffff00', padding: '15px', textAlign: 'center', fontWeight: 'bold', color: '#333', fontSize: '18px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
              {col.name} WEIGHT: {col.subTotal.toFixed(2)} KG
            </div>
          </div>
        ))}

        {/* SUMMARY SECTION */}
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '4px solid #03a9f4', padding: '20px', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)' }}>
          <h2 style={{ textAlign: 'center', fontWeight: '900', color: '#0288d1', margin: '0 0 15px 0', textTransform: 'uppercase', borderBottom: '2px solid #e1f5fe', paddingBottom: '10px' }}>Steel Consumption Summary</h2>
          {Object.entries(results.diaSummary).map(([dia, kg]) => (
            <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dotted #ccc', fontWeight: 'bold', fontSize: '15px' }}>
              <span style={{ color: '#03a9f4' }}>{dia}mm Steel:</span>
              <span>{kg.toFixed(2)} KG</span>
            </div>
          ))}
          <div style={{ marginTop: '20px', backgroundColor: '#8bc34a', padding: '18px', borderRadius: '15px', textAlign: 'center', fontWeight: '900', fontSize: '20px', color: '#000' }}>
            GRAND TOTAL: {results.grandTotal.toFixed(2)} KG
          </div>
        </div>

        <button onClick={addNewColumn} style={{ width: '100%', backgroundColor: '#0288d1', color: '#fff', fontWeight: 'bold', padding: '18px', borderRadius: '15px', border: 'none', marginTop: '25px', textTransform: 'uppercase', fontSize: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', cursor: 'pointer' }}>+ Add New Column (C{columns.length + 1})</button>
        <button onClick={generatePDF} style={{ width: '100%', backgroundColor: '#212121', color: '#fff', fontWeight: 'bold', padding: '18px', borderRadius: '15px', border: 'none', marginTop: '12px', textTransform: 'uppercase', fontSize: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', cursor: 'pointer' }}>Generate Summary PDF</button>
      </div>
    </div>
  );
};

const UIInput = ({ label, value, onChange }: any) => (
  <div style={{ flex: 1, backgroundColor: '#4fc3f7', padding: '10px', borderRadius: '15px' }}>
    <label style={{ display: 'block', color: '#fff', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>{label}</label>
    <input type="number" value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', border: 'none', borderRadius: '10px', padding: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
  </div>
);

const UISelect = ({ label, value, onChange, options }: any) => (
  <div style={{ flex: 1, backgroundColor: '#4fc3f7', padding: '10px', borderRadius: '15px' }}>
    <label style={{ display: 'block', color: '#fff', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>{label}</label>
    <select value={value} onChange={e => onChange(Number(e.target.value))} style={{ width: '100%', border: 'none', borderRadius: '10px', padding: '10px', fontWeight: 'bold', fontSize: '15px', textAlign: 'center', outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box' }}>
      {options.map((o: any) => <option key={o} value={o}>{o}mm</option>)}
    </select>
  </div>
);

export default ColumnBBS;
