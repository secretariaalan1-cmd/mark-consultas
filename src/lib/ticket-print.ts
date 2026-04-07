import { Appointment } from '@/types/scheduling';

export function printTicket(appt: Appointment) {
  const timeStr = appt.time || (appt.slot <= 15 ? '08:00' : '14:00');
  const dateFormatted = appt.date.split('-').reverse().join('/');
  
  const html = `
    <html>
    <head><title>Boleto - ${appt.patientName}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
      .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
      .header h2 { margin: 0; font-size: 16px; }
      .header p { margin: 4px 0 0; font-size: 12px; color: #666; }
      .field { margin: 8px 0; font-size: 14px; }
      .field strong { display: inline-block; min-width: 100px; }
      .footer { margin-top: 20px; border-top: 1px dashed #999; padding-top: 10px; text-align: center; font-size: 11px; color: #888; }
    </style>
    </head>
    <body>
      <div class="header">
        <h2>SAÚDE DA MULHER</h2>
        <p>Agendamento de Consultas — Camocim</p>
      </div>
      <div class="field"><strong>Paciente:</strong> ${appt.patientName}</div>
      <div class="field"><strong>Data:</strong> ${dateFormatted}</div>
      <div class="field"><strong>Horário:</strong> ${timeStr}</div>
      <div class="field"><strong>Vaga:</strong> ${String(appt.slot).padStart(2, '0')}</div>
      <div class="field"><strong>Turno:</strong> ${appt.slot <= 15 ? 'Manhã — Zona Rural' : 'Tarde — Cidade'}</div>
      ${appt.susCard ? `<div class="field"><strong>Cartão SUS:</strong> ${appt.susCard}</div>` : ''}
      ${appt.type === 'RETORNO' ? `<div class="field"><strong>Tipo:</strong> RETORNO</div>` : ''}
      <div class="footer">Apresente este comprovante no dia da consulta.</div>
    </body>
    </html>
  `;
  
  const w = window.open('', '_blank', 'width=450,height=500');
  if (w) {
    w.document.write(html);
    w.document.close();
    w.print();
  }
}
