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
  diaStirrups: number;
  spacing: string;
  height: string;
  numCols: string;
}

const ColumnBBS: React.FC = () => {
  const [method, setMethod] = useState<'excel' | 'precision'>('excel');
  const [columns, setColumns] = useState<ColumnData[]>([
    { 
      id: '1', name: 'C1', width: '230', depth: '300', 
      diaCorner: 12, numCorner: '4', 
      diaExtra: 12, numExtra: '2', 
      diaStirrups: 8, spacing: '6', height: '11', numCols: '1' 
    }
  ]);

  const updateCol = (id: string, field: keyof ColumnData, val: any) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c));
  };

  const addNewColumn = () => {
    const nextId = (columns.length + 1).toString();
    setColumns([...columns, { ...columns[0], id: nextId, name: `C${nextId}` }]);
  };

  // --- CALCULATION ENGINE ---
  const results = useMemo(() => {
    const diaSummary: Record<number, number> = {};
    let grandTotal = 0;

    const detailed = columns.map(col => {
      const nCols = parseFloat(col.numCols) || 0;
      const hFt = parseFloat(col.height) || 0;
      const sIn = parseFloat(col.spacing) || 1;
      const wMm = parseFloat(col.width) || 0;
      const dMm = parseFloat(col.depth) || 0;
      const hM = hFt * 0.3048;

      let cKg, eKg, sKg;

      if (method === 'excel') {
        // Excel Logic: No Lap + 3ft Fixed Stirrup Length
        cKg = hM * (parseFloat(col.numCorner) || 0) * getWeightPerMeter(col.diaCorner) * nCols;
        eKg = hM * (parseFloat(col.numExtra) || 0) * getWeightPerMeter(col.diaExtra) * nCols;
        const stirrupLenM = 0.9144; // 3.0 Ft
        const nStirrups = (Math.ceil((hFt * 12) / sIn) + 1) * nCols;
        sKg = stirrupLenM * nStirrups * getWeightPerMeter(col.diaStirrups);
      } else {
        // Precision Logic: 50d Lap + Exact Perimeter
        const lapC = (50 * col.diaCorner) / 1000;
        const lapE = (50 * col.diaExtra) / 1000;
        cKg = (hM + lapC) * (parseFloat(col.numCorner) || 0) * getWeightPerMeter(col.diaCorner) * nCols;
        eKg = (hM + lapE) * (parseFloat(col.numExtra) || 0) * getWeightPerMeter(col.diaExtra) * nCols;
        const stirrupLenM = (((wMm - 80) * 2) + ((dMm - 80) * 2) + 200) / 1000;
        const nStirrups = (Math.ceil((hFt * 12) / sIn) + 1) * nCols;
        sKg = stirrupLenM * nStirrups * getWeightPerMeter(col.diaStirrups);
      }

      const subTotal = cKg + eKg + sKg;
      grandTotal += subTotal;

      [[col.diaCorner, cKg], [col.diaExtra, eKg], [col.diaStirrups, sKg]].forEach(([d, kg]) => {
        diaSummary[d as number] = (diaSummary[d as number] || 0) + (kg as number);
      });

      return { ...col, subTotal };
    });

    return { detailed, diaSummary, grandTotal };
  }, [columns, method]);

  // --- PDF REPORT GENERATION ---
  const generatePDF = () => {
    const doc = new jsPDF();
    const modeName = method === 'excel' ? "EXCEL (SITE) METHOD" : "ENGINEERING (PRECISION) METHOD";
    
    doc.setFontSize(16);
    doc.text(`COLUMN BBS SUMMARY REPORT`, 105, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Calculation Mode: ${modeName}`, 14, 22);

    const tableRows = results.detailed.map(c => [
      c.name, 
      `${c.width}x${c.depth}`, 
      `${c.diaCorner}mm(${c.numCorner})`, 
      `${c.diaExtra}mm(${c.numExtra})`, 
      `${c.numCols}`, 
      `${c.subTotal.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['Name', 'Size(mm)', 'Corner bars', 'Extra bars', 'No. of Cols', 'Total KG']],
      body: tableRows,
      headStyles: { fillColor: [139, 195, 74] } // Green
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Final Diameter Summary', 'Total Weight (KG)']],
      body: Object.entries(results.diaSummary).map(([d, kg]) => [`${d}mm Steel`, `${Number(kg).toFixed(2)} KG`]),
      headStyles: { fillColor: [3, 169, 244] } // Blue
    });

    doc.save(`Column_BBS_${method}_Report.pdf`);
  };

  return (
    <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh', fontFamily: 'sans-serif', paddingBottom: '40px' }}>
      <div style={{ backgroundColor: '#8bc34a', padding: '15px', textAlign: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
        <h1 style={{ color: '#000', margin: 0, fontSize: '20px', fontWeight: 'bold' }}>COLUMN BBS CALCULATOR</h1>
      </div>

      {/* METHOD TOGGLE */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '15px', gap: '10px' }}>
        <button onClick={() => setMethod('excel')} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', fontWeight: 'bold', backgroundColor: method === 'excel' ? '#0288d1' : '#ccc', color: '#fff', cursor: 'pointer' }}>EXCEL (SITE)</button>
        <button onClick={() => setMethod('precision')} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', fontWeight: 'bold', backgroundColor: method === 'precision' ? '#0288d1' : '#ccc', color: '#fff', cursor: 'pointer' }}>ENGINEERING (LAP)</button>
      </div>

      <div style={{ padding: '12px' }}>
        {results.detailed.map(col => (
          <div key={col.id} style={{ backgroundColor: '#03a9f4', borderRadius: '20px', marginBottom: '20px', borderBottom: '10px solid #0288d1', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#0288d1', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 'bold' }}>
              <span>EDITABLE DATA - {col.name}</span>
              <button onClick={() => setColumns(columns.filter(i => i.id !== col.id))} style={{ background: '#f44336', border: 'none', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '15px' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <UIInput label="Width (MM)" value={col.width} onChange={v => updateCol(col.id, 'width', v)} />
                <UIInput label="Depth (MM)" value={col.depth} onChange={v => updateCol(col.id, 'depth', v)} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <UISelect label="Dia Corner" value={col.diaCorner} onChange={v => updateCol(col.id, 'diaCorner', v)} options={[12, 16, 20, 25, 32]} />
                <UIInput label="Corner Nos" value={col.numCorner} onChange={v => updateCol(col.id, 'numCorner', v)} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <UISelect label="Dia Extra" value={col.diaExtra} onChange={v => updateCol(col.id, 'diaExtra', v)} options={[10, 12, 16, 20, 25, 32]} />
                <UIInput label="Extra Nos" value={col.numExtra} onChange={v => updateCol(col.id, 'numExtra', v)} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <UISelect label="Dia Stirrups" value={col.diaStirrups} onChange={v => updateCol(col.id, 'diaStirrups', v)} options={[8, 10, 12]} />
                <UIInput label="Spacing (Inch)" value={col.spacing} onChange={v => updateCol(col.id, 'spacing', v)} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <UIInput label="Height (Ft)" value={col.height} onChange={v => updateCol(col.id, 'height', v)} />
                <UIInput label="No. of Columns" value={col.numCols} onChange={v => updateCol(col.id, 'numCols', v)} />
              </div>
            </div>

            <div style={{ backgroundColor: '#ffff00', padding: '15px', textAlign: 'center', fontWeight: 'bold', fontSize: '18px', color: '#333' }}>
              {col.name} WEIGHT: {col.subTotal.toFixed(2)} KG
            </div>
          </div>
        ))}

        {/* SUMMARY SECTION */}
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '4px solid #03a9f4', padding: '20px' }}>
          <h2 style={{ textAlign: 'center', fontWeight: '900', color: '#0288d1', margin: '0 0 15px 0', textTransform: 'uppercase' }}>Steel Summary ({method.toUpperCase()})</h2>
          {Object.entries(results.diaSummary).map(([dia, kg]) => (
            <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dotted #ccc', fontWeight: 'bold' }}>
              <span style={{ color: '#03a9f4' }}>{dia}mm Steel:</span>
              <span>{Number(kg).toFixed(2)} KG</span>
            </div>
          ))}
          <div style={{ marginTop: '20px', backgroundColor: '#8bc34a', padding: '18px', borderRadius: '15px', textAlign: 'center', fontWeight: '900', fontSize: '20px' }}>
            GRAND TOTAL: {results.grandTotal.toFixed(2)} KG
          </div>
        </div>

        <button onClick={addNewColumn} style={{ width: '100%', backgroundColor: '#0288d1', color: '#fff', fontWeight: 'bold', padding: '18px', borderRadius: '15px', border: 'none', marginTop: '25px', cursor: 'pointer', textTransform: 'uppercase' }}>+ Add New Column</button>
        <button onClick={generatePDF} style={{ width: '100%', backgroundColor: '#212121', color: '#fff', fontWeight: 'bold', padding: '18px', borderRadius: '15px', border: 'none', marginTop: '12px', cursor: 'pointer', textTransform: 'uppercase' }}>Generate Summary PDF</button>
      </div>
    </div>
  );
};

const UIInput = ({ label, value, onChange }: any) => (
  <div style={{ flex: 1, backgroundColor: '#4fc3f7', padding: '10px', borderRadius: '15px' }}>
    <label style={{ display: 'block', color: '#fff', fontSize: '10px', fontWeight: 'bold', marginBottom: '5px' }}>{label}</label>
    <input type="number" value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', border: 'none', borderRadius: '10px', padding: '10px', textAlign: 'center', fontWeight: 'bold', outline: 'none' }} />
  </div>
);

const UISelect = ({ label, value, onChange, options }: any) => (
  <div style={{ flex: 1, backgroundColor: '#4fc3f7', padding: '10px', borderRadius: '15px' }}>
    <label style={{ display: 'block', color: '#fff', fontSize: '10px', fontWeight: 'bold', marginBottom: '5px' }}>{label}</label>
    <select value={value} onChange={e => onChange(Number(e.target.value))} style={{ width: '100%', border: 'none', borderRadius: '10px', padding: '10px', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#fff', outline: 'none' }}>
      {options.map((o: any) => <option key={o} value={o}>{o}mm</option>)}
    </select>
  </div>
);

export default ColumnBBS;
