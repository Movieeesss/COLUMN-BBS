import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const STEEL_REF: Record<number, { rods: number; bundleWeight: number }> = {
  8:  { rods: 10, bundleWeight: 47.4 },
  10: { rods: 7,  bundleWeight: 51.87 },
  12: { rods: 5,  bundleWeight: 53.35 },
  16: { rods: 3,  bundleWeight: 56.88 },
  20: { rods: 2,  bundleWeight: 59.26 },
  25: { rods: 1,  bundleWeight: 46.3 },
};

export default function FootingBBSCalculator() {
  const [rows, setRows] = useState<any[]>([
    { id: 1, tag: 'T1', s: '4', d: '10', sp: '150', qty: '3' }
  ]);

  // SEAMLESS CALCULATION ENGINE
  // Memoized to prevent lag during typing
  const computedData = useMemo(() => {
    const results = rows.map(r => {
      const s = parseFloat(r.s) || 0;
      const d = parseFloat(r.d) || 0;
      const sp = parseFloat(r.sp) || 0;
      const qty = parseFloat(r.qty) || 0;

      if (s === 0 || d === 0 || sp === 0) return { ...r, bars: 0, totalKg: 0 };

      // Excel Exact Formulas
      const sizeM = s / 3.281;
      const bars = Math.ceil(((sizeM * 1000) - 100) / sp + 1) * 2;
      const lengthM = ((s + 0.6666) * bars) / 3.281;
      const totalKg = (lengthM * ((d * d) / 162)) * qty;

      return { ...r, bars, totalKg };
    });

    const summary: Record<number, number> = { 8: 0, 10: 0, 12: 0, 16: 0, 20: 0, 25: 0 };
    results.forEach(res => {
      const dia = parseInt(res.d);
      if (summary[dia] !== undefined) summary[dia] += res.totalKg;
    });

    return { results, summary };
  }, [rows]);

  const addRow = () => setRows([...rows, { 
    id: Date.now(), 
    tag: `T${rows.length + 1}`, 
    s: '4', d: '10', sp: '150', qty: '1' 
  }]);

  const deleteRow = (id: number) => setRows(rows.filter(row => row.id !== id));
  
  const updateRow = (id: number, field: string, val: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: val } : row));
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text("FOOTING BBS SUMMARY REPORT", 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [['Type', 'Size (Ft)', 'Dia (mm)', 'Spacing', 'Qty', 'Total KG']],
      body: computedData.results.map(r => [
        r.tag, `${r.s}x${r.s}`, `${r.d}mm`, r.sp, r.qty, r.totalKg.toFixed(2)
      ]),
      headStyles: { fillColor: [146, 208, 80] } // Green Color Tone
    });

    const summaryRows = Object.entries(computedData.summary)
      .filter(([_, kg]) => kg > 0)
      .map(([dia, kg]) => [`${dia}mm Steel`, `${kg.toFixed(2)} KG`]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Final Diameter Summary', 'Total Weight']],
      body: summaryRows,
      headStyles: { fillColor: [0, 112, 192] } // Blue Color Tone
    });
    doc.save("Footing_BBS_Report.pdf");
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', minHeight: '100vh', paddingBottom: '40px' }}>
      {/* Header Matching Doubly Reinforced Tool */}
      <header style={{ backgroundColor: '#92d050', padding: '15px', textAlign: 'center', fontWeight: '900', fontSize: '18px', borderBottom: '3px solid #76b041' }}>
        FOOTING BBS CALCULATOR
      </header>

      <div style={{ padding: '12px' }}>
        {rows.map((row, index) => {
          const res = computedData.results[index];
          return (
            <div key={row.id} style={{ marginBottom: '20px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #ccc', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
              <div style={{ backgroundColor: '#00b0f0', border: '2px solid #0070c0' }}>
                <div style={{ backgroundColor: '#0070c0', color: 'white', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>EDITABLE DATA - {row.tag}</span>
                  <button onClick={() => deleteRow(row.id)} style={{ background: '#ff4d4d', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer' }}>×</button>
                </div>
                
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.25)', padding: '6px 10px', borderRadius: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '900' }}>Size (Ft)</label>
                    <input type="text" inputMode="decimal" value={row.s} onChange={e => updateRow(row.id, 's', e.target.value)} style={{ width: '85px', textAlign: 'right', padding: '5px', border: '1px solid #0070c0', borderRadius: '4px', fontWeight: 'bold' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.25)', padding: '6px 10px', borderRadius: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '900' }}>Dia (mm)</label>
                    <select value={row.d} onChange={e => updateRow(row.id, 'd', e.target.value)} style={{ width: '97px', padding: '5px', border: '1px solid #0070c0', borderRadius: '4px', fontWeight: 'bold' }}>
                      {[8, 10, 12, 16, 20, 25].map(d => <option key={d} value={d}>{d}mm</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.25)', padding: '6px 10px', borderRadius: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '900' }}>Spacing (mm)</label>
                    <input type="text" inputMode="numeric" value={row.sp} onChange={e => updateRow(row.id, 'sp', e.target.value)} style={{ width: '85px', textAlign: 'right', padding: '5px', border: '1px solid #0070c0', borderRadius: '4px', fontWeight: 'bold' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.25)', padding: '6px 10px', borderRadius: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '900' }}>Qty (Nos)</label>
                    <input type="text" inputMode="numeric" value={row.qty} onChange={e => updateRow(row.id, 'qty', e.target.value)} style={{ width: '85px', textAlign: 'right', padding: '5px', border: '1px solid #0070c0', borderRadius: '4px', fontWeight: '900' }} />
                  </div>
                </div>
              </div>

              {/* Yellow Result Area */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', backgroundColor: '#ffff00', fontWeight: 'bold', borderBottom: '1px solid #ddd', fontSize: '13px' }}>
                <span>Total Bars</span>
                <span>{res.bars} Nos</span>
              </div>
              <div style={{ backgroundColor: '#92d050', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #76b041' }}>
                <span style={{ fontWeight: '900', fontSize: '14px', fontStyle: 'italic' }}>TOTAL WEIGHT</span>
                <span style={{ fontWeight: '900', fontSize: '18px', color: '#003366' }}>{res.totalKg.toFixed(2)} KG</span>
              </div>
            </div>
          );
        })}

        {/* SUMMARY SECTION */}
        <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '12px', border: '2px solid #0070c0', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', textAlign: 'center', borderBottom: '2px solid #0070c0', paddingBottom: '5px' }}>STEEL CONSUMPTION SUMMARY</h3>
          {Object.entries(computedData.summary).map(([dia, kg]) => kg > 0 && (
            <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #ccc' }}>
              <span style={{ fontWeight: 'bold', color: '#0070c0' }}>{dia}mm Steel:</span>
              <span style={{ fontWeight: 'bold' }}>{kg.toFixed(2)} KG</span>
            </div>
          ))}
        </div>

        <button onClick={addRow} style={{ width: '100%', padding: '14px', backgroundColor: '#0070c0', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', marginBottom: '12px', cursor: 'pointer', fontSize: '13px' }}>
          + ADD NEW FOOTING TYPE
        </button>

        <button onClick={generatePDF} style={{ width: '100%', padding: '16px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}>
          GENERATE SUMMARY PDF
        </button>
      </div>
    </div>
  );
}
