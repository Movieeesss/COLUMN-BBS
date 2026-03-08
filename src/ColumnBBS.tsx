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
  numColumns: string;
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

      const cornerKg = hM * (parseFloat(col.numCorner) || 0) * getWeight(col.diaCorner) * nCols;
      const extraKg = hM * (parseFloat(col.numExtra) || 0) * getWeight(col.diaExtra) * nCols;
      const tieLen = (((w - 80) * 2) + ((d - 80) * 2) + 200) / 1000;
      const nTies = (Math.ceil((h * 12) / s) + 1) * nCols;
      const tiesKg = tieLen * nTies * getWeight(col.diaTies);

      const subTotal = cornerKg + extraKg + tiesKg;
      grandTotalKg += subTotal;

      [[col.diaCorner, cornerKg], [col.diaExtra, extraKg], [col.diaTies, tiesKg]].forEach(([dia, kg]) => {
        diaTotals[dia] = (diaTotals[dia] || 0) + kg;
      });

      return { ...col, subTotal, nTies };
    });

    return { detailed, diaTotals, grandTotalKg };
  }, [columns]);

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text("COLUMN BBS SUMMARY REPORT", 14, 15);
    autoTable(doc, {
      startY: 25,
      head: [['Name', 'Size', 'Corner', 'Extra', 'No. of Cols', 'Total KG']],
      body: results.detailed.map(c => [c.name, `${c.width}x${c.depth}`, `${c.diaCorner}mm(${c.numCorner})`, `${c.diaExtra}mm(${c.numExtra})`, c.numColumns, c.subTotal.toFixed(2)]),
      headStyles: { fillColor: [139, 195, 74] }
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Final Diameter Summary', 'Total Weight (KG)']],
      body: Object.entries(results.diaTotals).map(([d, kg]) => [`${d}mm Steel`, `${kg.toFixed(2)} KG`]),
      headStyles: { fillColor: [3, 169, 244] }
    });
    doc.save("Column_BBS_Report.pdf");
  };

  return (
    <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh', fontFamily: 'sans-serif', paddingBottom: '40px' }}>
      {/* HEADER SECTION */}
      <div style={{ backgroundColor: '#8bc34a', padding: '15px', textAlign: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
        <h1 style={{ color: '#000', margin: 0, fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase' }}>
          Column BBS Calculator
        </h1>
      </div>

      <div style={{ padding: '12px' }}>
        {results.detailed.map((col) => (
          <div key={col.id} style={{ backgroundColor: '#03a9f4', borderRadius: '15px', marginBottom: '20px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', borderBottom: '8px solid #0288d1' }}>
            {/* BLUE HEADER */}
            <div style={{ backgroundColor: '#0288d1', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>
              <span>EDITABLE DATA - {col.name}</span>
              <button onClick={() => setColumns(columns.filter(i => i.id !== col.id))} style={{ backgroundColor: '#f44336', border: 'none', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* INPUT AREA */}
            <div style={{ padding: '15px' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <UIInput label="Width (mm)" value={col.width} onChange={v => updateCol(col.id, 'width', v)} />
                <UIInput label="Depth (mm)" value={col.depth} onChange={v => updateCol(col.id, 'depth', v)} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <UISelect label="Dia Corner" value={col.diaCorner} onChange={v => updateCol(col.id, 'diaCorner', v)} options={[12, 16, 20, 25]} />
                <UIInput label="Corner Nos" value={col.numCorner} onChange={v => updateCol(col.id, 'numCorner', v)} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <UISelect label="Dia Extra" value={col.diaExtra} onChange={v => updateCol(col.id, 'diaExtra', v)} options={[10, 12, 16, 20]} />
                <UIInput label="Extra Nos" value={col.numExtra} onChange={v => updateCol(col.id, 'numExtra', v)} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <UIInput label="Height (Ft)" value={col.height} onChange={v => updateCol(col.id, 'height', v)} />
                <UIInput label="No. of Columns" value={col.numColumns} onChange={v => updateCol(col.id, 'numColumns', v)} />
              </div>
            </div>

            {/* YELLOW WEIGHT BAR */}
            <div style={{ backgroundColor: '#ffff00', padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#333', fontSize: '16px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
              {col.name} WEIGHT: {col.subTotal.toFixed(2)} KG
            </div>
          </div>
        ))}

        {/* SUMMARY CARD */}
        <div style={{ backgroundColor: '#fff', borderRadius: '15px', border: '3px solid #03a9f4', padding: '15px', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)' }}>
          <h2 style={{ textAlign: 'center', fontWeight: '900', color: '#0288d1', margin: '0 0 15px 0', textTransform: 'uppercase', borderBottom: '2px solid #e1f5fe', paddingBottom: '10px' }}>
            Steel Consumption Summary
          </h2>
          {Object.entries(results.diaTotals).map(([dia, kg]) => (
            <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dotted #ccc', fontWeight: 'bold', color: '#333' }}>
              <span style={{ color: '#03a9f4' }}>{dia}mm Steel:</span>
              <span>{kg.toFixed(2)} KG</span>
            </div>
          ))}
          <div style={{ marginTop: '20px', backgroundColor: '#8bc34a', padding: '15px', borderRadius: '12px', textAlign: 'center', fontWeight: '900', fontSize: '18px', color: '#000', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            GRAND TOTAL: {results.grandTotalKg.toFixed(2)} KG
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <button onClick={addNewColumn} style={{ width: '100%', backgroundColor: '#0288d1', color: '#fff', fontWeight: 'bold', padding: '16px', borderRadius: '12px', border: 'none', marginTop: '20px', textTransform: 'uppercase', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', cursor: 'pointer' }}>
          + Add New Column (C{columns.length + 1})
        </button>
        <button onClick={generatePDF} style={{ width: '100%', backgroundColor: '#212121', color: '#fff', fontWeight: 'bold', padding: '16px', borderRadius: '12px', border: 'none', marginTop: '12px', textTransform: 'uppercase', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', cursor: 'pointer' }}>
          Generate Summary PDF
        </button>
      </div>
    </div>
  );
};

// --- HELPER COMPONENTS ---
const UIInput = ({ label, value, onChange }: any) => (
  <div style={{ flex: 1, backgroundColor: '#4fc3f7', padding: '8px', borderRadius: '12px' }}>
    <label style={{ display: 'block', color: '#fff', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</label>
    <input 
      type="number" 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      style={{ width: '100%', border: 'none', borderRadius: '8px', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} 
    />
  </div>
);

const UISelect = ({ label, value, onChange, options }: any) => (
  <div style={{ flex: 1, backgroundColor: '#4fc3f7', padding: '8px', borderRadius: '12px' }}>
    <label style={{ display: 'block', color: '#fff', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</label>
    <select 
      value={value} 
      onChange={e => onChange(Number(e.target.value))} 
      style={{ width: '100%', border: 'none', borderRadius: '8px', padding: '8px', fontWeight: 'bold', fontSize: '14px', textAlign: 'center', outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box' }}
    >
      {options.map((o: any) => <option key={o} value={o}>{o}mm</option>)}
    </select>
  </div>
);

export default ColumnBBS;
