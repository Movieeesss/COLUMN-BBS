import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
      
      // --- CALCULATION LOGIC SELECTION ---
      let cornerKg, extraKg, stirrupsKg;

      if (method === 'excel') {
        // EXCEL METHOD: Straight height and simplified 3ft stirrup length
        cornerKg = heightM * (parseFloat(col.numCorner) || 0) * getWeightPerMeter(col.diaCorner) * nCols;
        extraKg = heightM * (parseFloat(col.numExtra) || 0) * getWeightPerMeter(col.diaExtra) * nCols;
        
        const stirrupLengthM = 0.9144; // Fixed 3.0 Ft as per your Excel T1/T2 row
        const totalTies = (Math.ceil((hFt * 12) / sIn) + 1) * nCols;
        stirrupsKg = stirrupLengthM * totalTies * getWeightPerMeter(col.diaStirrups);
      } else {
        // PRECISION METHOD: Adds 50d Lap and uses Exact Perimeter
        const lapCornerM = (50 * col.diaCorner) / 1000;
        const lapExtraM = (50 * col.diaExtra) / 1000;
        
        cornerKg = (heightM + lapCornerM) * (parseFloat(col.numCorner) || 0) * getWeightPerMeter(col.diaCorner) * nCols;
        extraKg = (heightM + lapExtraM) * (parseFloat(col.numExtra) || 0) * getWeightPerMeter(col.diaExtra) * nCols;
        
        const stirrupLengthM = (((wMm - 80) * 2) + ((dMm - 80) * 2) + 200) / 1000;
        const totalTies = (Math.ceil((hFt * 12) / sIn) + 1) * nCols;
        stirrupsKg = stirrupLengthM * totalTies * getWeightPerMeter(col.diaStirrups);
      }

      const subTotal = cornerKg + extraKg + stirrupsKg;
      grandTotal += subTotal;

      [[col.diaCorner, cornerKg], [col.diaExtra, extraKg], [col.diaStirrups, stirrupsKg]].forEach(([d, kg]) => {
        diaSummary[d as number] = (diaSummary[d as number] || 0) + (kg as number);
      });

      return { ...col, subTotal };
    });

    return { detailed, diaSummary, grandTotal };
  }, [columns, method]);

  return (
    <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh', fontFamily: 'sans-serif', paddingBottom: '40px' }}>
      {/* Header with Color Theme */}
      <div style={{ backgroundColor: '#8bc34a', padding: '15px', textAlign: 'center', color: '#000', fontWeight: 'bold' }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>COLUMN BBS CALCULATOR</h1>
      </div>

      {/* METHOD TOGGLE SWITCH */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '15px', gap: '10px' }}>
        <button 
          onClick={() => setMethod('excel')}
          style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', fontWeight: 'bold', backgroundColor: method === 'excel' ? '#0288d1' : '#ccc', color: '#fff' }}
        >
          EXCEL (SITE)
        </button>
        <button 
          onClick={() => setMethod('precision')}
          style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', fontWeight: 'bold', backgroundColor: method === 'precision' ? '#0288d1' : '#ccc', color: '#fff' }}
        >
          ENGINEERING (LAP)
        </button>
      </div>

      <div style={{ padding: '12px' }}>
        {results.detailed.map(col => (
          <div key={col.id} style={{ backgroundColor: '#03a9f4', borderRadius: '20px', marginBottom: '20px', overflow: 'hidden', boxShadow: '0 5px 15px rgba(0,0,0,0.2)', borderBottom: '10px solid #0288d1' }}>
            <div style={{ backgroundColor: '#0288d1', padding: '12px', display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 'bold' }}>
              <span>{col.name} - {method.toUpperCase()} MODE</span>
              <button onClick={() => setColumns(columns.filter(i => i.id !== col.id))} style={{ background: '#f44336', border: 'none', color: '#fff', borderRadius: '50%', width: '24px', height: '24px' }}>✕</button>
            </div>

            <div style={{ padding: '15px' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <Box label="Width (MM)" value={col.width} onChange={v => updateCol(col.id, 'width', v)} />
                <Box label="Depth (MM)" value={col.depth} onChange={v => updateCol(col.id, 'depth', v)} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <Sel label="Dia Corner" value={col.diaCorner} onChange={v => updateCol(col.id, 'diaCorner', v)} options={[12, 16, 20, 25]} />
                <Box label="Corner Nos" value={col.numCorner} onChange={v => updateCol(col.id, 'numCorner', v)} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <Sel label="Dia Extra" value={col.diaExtra} onChange={v => updateCol(col.id, 'diaExtra', v)} options={[12, 16, 20, 25]} />
                <Box label="Extra Nos" value={col.numExtra} onChange={v => updateCol(col.id, 'numExtra', v)} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <Sel label="Dia Stirrups" value={col.diaStirrups} onChange={v => updateCol(col.id, 'diaStirrups', v)} options={[8, 10, 12]} />
                <Box label="Spacing (Inch)" value={col.spacing} onChange={v => updateCol(col.id, 'spacing', v)} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Box label="Height (Ft)" value={col.height} onChange={v => updateCol(col.id, 'height', v)} />
                <Box label="No. of Columns" value={col.numCols} onChange={v => updateCol(col.id, 'numCols', v)} />
              </div>
            </div>

            <div style={{ backgroundColor: '#ffff00', padding: '15px', textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>
              {col.name} WEIGHT: {col.subTotal.toFixed(2)} KG
            </div>
          </div>
        ))}

        <div style={{ backgroundColor: '#fff', borderRadius: '15px', border: '4px solid #03a9f4', padding: '20px' }}>
          <h2 style={{ textAlign: 'center', color: '#0288d1', textTransform: 'uppercase' }}>Steel Summary ({method})</h2>
          {Object.entries(results.diaSummary).map(([dia, kg]) => (
            <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dotted #ccc', fontWeight: 'bold' }}>
              <span>{dia}mm Steel:</span>
              <span>{Number(kg).toFixed(2)} KG</span>
            </div>
          ))}
          <div style={{ marginTop: '20px', backgroundColor: '#8bc34a', padding: '15px', borderRadius: '12px', textAlign: 'center', fontWeight: '900', fontSize: '20px' }}>
            GRAND TOTAL: {results.grandTotal.toFixed(2)} KG
          </div>
        </div>

        <button onClick={addNewColumn} style={{ width: '100%', backgroundColor: '#0288d1', color: '#fff', fontWeight: 'bold', padding: '16px', borderRadius: '12px', border: 'none', marginTop: '20px' }}>+ Add New Column</button>
      </div>
    </div>
  );
};

const Box = ({ label, value, onChange }: any) => (
  <div style={{ flex: 1, backgroundColor: '#4fc3f7', padding: '10px', borderRadius: '15px' }}>
    <label style={{ color: '#fff', fontSize: '10px', fontWeight: 'bold', display: 'block' }}>{label}</label>
    <input type="number" value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', border: 'none', borderRadius: '10px', padding: '8px', textAlign: 'center', fontWeight: 'bold' }} />
  </div>
);

const Sel = ({ label, value, onChange, options }: any) => (
  <div style={{ flex: 1, backgroundColor: '#4fc3f7', padding: '10px', borderRadius: '15px' }}>
    <label style={{ color: '#fff', fontSize: '10px', fontWeight: 'bold', display: 'block' }}>{label}</label>
    <select value={value} onChange={e => onChange(Number(e.target.value))} style={{ width: '100%', border: 'none', borderRadius: '10px', padding: '8px', fontWeight: 'bold', backgroundColor: '#fff' }}>
      {options.map((o: any) => <option key={o} value={o}>{o}mm</option>)}
    </select>
  </div>
);

export default ColumnBBS;
