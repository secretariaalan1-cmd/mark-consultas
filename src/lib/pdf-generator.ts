import { Appointment } from '@/types/scheduling';

export function generatePDF(date: string, appointments: Appointment[]) {
  const manha = appointments.filter(a => a.slot <= 15).sort((a, b) => a.slot - b.slot);
  const tarde = appointments.filter(a => a.slot > 15).sort((a, b) => a.slot - b.slot);

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const buildRows = (items: Appointment[], startSlot: number, count: number) => {
    let html = '';
    for (let i = 0; i < count; i++) {
      const slot = startSlot + i;
      const appt = items.find(a => a.slot === slot);
      html += `<tr>
        <td style="text-align:center;font-weight:600;">${slot}</td>
        <td>${appt?.patientName || ''}</td>
        <td style="font-family:monospace;font-size:12px;">${appt?.susCard || ''}</td>
        <td>${appt?.dob || ''}</td>
        <td>${appt?.psf || ''}</td>
        <td>${appt?.reason || ''}</td>
        <td style="text-align:center;">${appt ? (appt.type === 'RETORNO' ? '<strong style="color:#ea580c;">RETORNO</strong>' : 'NORMAL') : ''}</td>
        <td style="width:120px;"></td>
      </tr>`;
    }
    return html;
  };

  const tableStyle = `
    width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;
  `;
  const thStyle = `
    background:#f1f5f9;padding:6px 8px;border:1px solid #cbd5e1;text-align:left;font-size:12px;font-weight:600;
  `;
  const tdStyle = `
    padding:5px 8px;border:1px solid #e2e8f0;
  `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Agenda ${formatDate(date)}</title>
      <style>
        @page { size: A4 portrait; margin: 15mm; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; }
        h1 { font-size: 16px; text-align: center; margin-bottom: 4px; }
        h2 { font-size: 13px; text-align: center; margin-bottom: 16px; color: #64748b; font-weight: normal; }
        h3 { font-size: 14px; margin: 16px 0 8px; padding: 4px 8px; border-radius: 4px; }
        .rural { background: #d1fae5; color: #065f46; }
        .cidade { background: #ede9fe; color: #5b21b6; }
        table { ${tableStyle} }
        th { ${thStyle} }
        td { ${tdStyle} }
        tr:nth-child(even) td { background: #f8fafc; }
        .signature { margin-top: 40px; text-align: center; border-top: 1px solid #1e293b; padding-top: 8px; width: 300px; margin-left: auto; margin-right: auto; font-size: 13px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>LISTA DE PACIENTES PARA ATENDIMENTO</h1>
      <h2>Data: ${formatDate(date)}</h2>

      <h3 class="rural">MANHÃ — 08:00 — ZONA RURAL (Vagas 1–15)</h3>
      <table>
        <thead>
          <tr>
            <th style="width:35px;">Nº</th>
            <th>NOME</th>
            <th>CARTÃO SUS</th>
            <th>NASCIMENTO</th>
            <th>PSF</th>
            <th>MOTIVO</th>
            <th>TIPO</th>
            <th>ASSINATURA</th>
          </tr>
        </thead>
        <tbody>${buildRows(manha, 1, 15)}</tbody>
      </table>

      <h3 class="cidade">TARDE — 14:00 — CIDADE / CAMOCIM (Vagas 16–30)</h3>
      <table>
        <thead>
          <tr>
            <th style="width:35px;">Nº</th>
            <th>NOME</th>
            <th>CARTÃO SUS</th>
            <th>NASCIMENTO</th>
            <th>PSF</th>
            <th>MOTIVO</th>
            <th>TIPO</th>
            <th>ASSINATURA</th>
          </tr>
        </thead>
        <tbody>${buildRows(tarde, 16, 15)}</tbody>
      </table>

      <div class="signature">Assinatura do Médico</div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }
}
