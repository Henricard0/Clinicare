import React, { useState, useEffect } from 'react';
import { User, Patient, Payment } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, Plus, Search, DollarSign, Download, X, Printer } from 'lucide-react';

interface FinancialViewProps {
  currentUser: User;
  patients: Patient[];
}

export const FinancialView: React.FC<FinancialViewProps> = ({ currentUser, patients }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isNewPaymentOpen, setIsNewPaymentOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New Payment State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState<'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'DINHEIRO' | 'TRANSFERENCIA'>('PIX');
  const [description, setDescription] = useState('Sessão de Psicoterapia');

  // Statement State
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [statementPatientId, setStatementPatientId] = useState('');
  const [statementStartDate, setStatementStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [statementEndDate, setStatementEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    // Carregar pagamentos do mock local
    const saved = localStorage.getItem('clinicacare_payments');
    if (saved) {
      setPayments(JSON.parse(saved));
    }
  }, []);

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    
    const patient = patients.find(p => p.id === selectedPatientId);
    if (!patient) return;
    
    const newPayment: Payment = {
      id: `pay_${Date.now()}`,
      patient_id: patient.id,
      patient_name: patient.full_name,
      professional_id: currentUser.id,
      professional_name: currentUser.name,
      amount: parseFloat(amount),
      payment_method: method,
      date: date,
      description: description,
      status: 'PAGO',
      created_at: new Date().toISOString(),
    };
    
    const updatedPayments = [newPayment, ...payments];
    setPayments(updatedPayments);
    localStorage.setItem('clinicacare_payments', JSON.stringify(updatedPayments));
    
    setIsNewPaymentOpen(false);
    setSelectedPatientId('');
    setAmount('');
    setDescription('Sessão de Psicoterapia');
  };

  const generatePDF = (payment: Payment) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Configurações e Cabeçalho
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("RECIBO DE PAGAMENTO", 105, 25, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("ClínicaCare - Gestão Clínica Inteligente", 105, 32, { align: "center" });

    // Informações do Recibo (Bloco 1)
    doc.setDrawColor(200);
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(15, 40, 180, 25, 3, 3, 'FD');
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Recibo Nº: ${payment.id.replace('pay_', '')}`, 20, 50);
    doc.text(`Valor: R$ ${payment.amount.toFixed(2).replace('.', ',')}`, 140, 50);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const dateFormatted = new Date(payment.date).toLocaleDateString('pt-BR');
    doc.text(`Data de Emissão: ${dateFormatted}`, 20, 58);
    
    // Texto do Recibo
    doc.setFontSize(12);
    const textoRecibo = `Recebi(emos) de ${payment.patient_name}, a quantia de R$ ${payment.amount.toFixed(2).replace('.', ',')}, referente a ${payment.description}.`;
    const lines = doc.splitTextToSize(textoRecibo, 170);
    doc.text(lines, 20, 80);

    // Forma de Pagamento
    doc.setFont("helvetica", "bold");
    doc.text("Forma de Pagamento:", 20, 100);
    doc.setFont("helvetica", "normal");
    const methodNames = {
      PIX: 'Pix',
      CARTAO_CREDITO: 'Cartão de Crédito',
      CARTAO_DEBITO: 'Cartão de Débito',
      DINHEIRO: 'Dinheiro',
      TRANSFERENCIA: 'Transferência Bancária'
    };
    doc.text(methodNames[payment.payment_method], 65, 100);

    // Dados do Profissional Emissor
    doc.line(60, 130, 150, 130);
    doc.setFont("helvetica", "bold");
    doc.text(payment.professional_name, 105, 137, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (currentUser.council_number) {
      doc.text(currentUser.council_number, 105, 143, { align: "center" });
    }

    doc.setFontSize(8);
    doc.text("Este documento não possui valor fiscal.", 105, 160, { align: "center" });

    doc.save(`Recibo_${payment.patient_name.replace(/\s+/g, '_')}_${dateFormatted}.pdf`);
  };

  const generateStatementPDF = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!statementPatientId) return;

    const patient = patients.find(p => p.id === statementPatientId);
    if (!patient) return;

    // Filter payments
    const filtered = payments.filter(p => {
      const pDate = p.date;
      return p.patient_id === statementPatientId && pDate >= statementStartDate && pDate <= statementEndDate;
    });

    // Sort by date ascending
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Configurações e Cabeçalho
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("EXTRATO DE PAGAMENTOS", 105, 25, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("ClínicaCare - Gestão Clínica Inteligente", 105, 32, { align: "center" });

    // Informações do Extrato
    doc.setDrawColor(200);
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(15, 40, 180, 30, 3, 3, 'FD');
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Paciente: ${patient.full_name}`, 20, 50);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const startFormatted = new Date(statementStartDate + 'T12:00:00').toLocaleDateString('pt-BR');
    const endFormatted = new Date(statementEndDate + 'T12:00:00').toLocaleDateString('pt-BR');
    doc.text(`Período: ${startFormatted} a ${endFormatted}`, 20, 58);
    
    doc.text(`Profissional: ${currentUser.name} ${currentUser.council_number ? `(${currentUser.council_number})` : ''}`, 20, 66);

    // Tabela
    const methodNames = {
      PIX: 'Pix',
      CARTAO_CREDITO: 'Cartão de Crédito',
      CARTAO_DEBITO: 'Cartão de Débito',
      DINHEIRO: 'Dinheiro',
      TRANSFERENCIA: 'Transferência Bancária'
    };

    const tableData = filtered.map(p => [
      new Date(p.date + 'T12:00:00').toLocaleDateString('pt-BR'),
      p.description,
      methodNames[p.payment_method],
      `R$ ${p.amount.toFixed(2).replace('.', ',')}`
    ]);

    const total = filtered.reduce((acc, p) => acc + p.amount, 0);
    
    // Add total row
    tableData.push(['', '', 'TOTAL DO PERÍODO', `R$ ${total.toFixed(2).replace('.', ',')}`]);

    autoTable(doc, {
      startY: 75,
      head: [['Data', 'Descrição', 'Forma de Pagamento', 'Valor']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [90, 90, 64], textColor: 255 },
      styles: { font: 'helvetica', fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 70 },
        2: { cellWidth: 45 },
        3: { cellWidth: 35, halign: 'right' }
      },
      willDrawCell: function(data) {
        if (data.row.index === tableData.length - 1) {
          doc.setFont('helvetica', 'bold');
          if (data.column.index === 2) {
            data.cell.styles.halign = 'right';
          }
        }
      }
    });

    doc.save(`Extrato_${patient.full_name.replace(/\s+/g, '_')}_${startFormatted.replace(/\//g, '-')}_a_${endFormatted.replace(/\//g, '-')}.pdf`);
    setIsStatementModalOpen(false);
  };

  const filteredPayments = payments.filter(p => 
    p.patient_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-xs border border-[#E5E2D9] p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#3D3D39] flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-[#708A63]" />
            Folha de Pagamento
          </h2>
          <p className="text-sm text-[#8A8A82] mt-1">Gerencie os pagamentos e gere recibos em PDF.</p>
        </div>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setIsStatementModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#F2F0EA] text-[#5A5A40] rounded-lg font-medium hover:bg-[#E5E2D9] transition-colors"
          >
            <Download className="w-4 h-4" />
            Extrato por Período
          </button>
          <button
            onClick={() => setIsNewPaymentOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#5A5A40] text-white rounded-lg font-medium hover:bg-[#4A4A35] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Pagamento
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8A82]" />
        <input
          type="text"
          placeholder="Buscar pagamento por paciente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-[#E5E2D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40]"
        />
      </div>

      {/* Tabela de Pagamentos */}
      <div className="bg-white rounded-xl shadow-xs border border-[#E5E2D9] overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[#F2F0EA] flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-[#8A8A82]" />
            </div>
            <h3 className="text-[#3D3D39] font-medium mb-1">Nenhum pagamento registrado</h3>
            <p className="text-sm text-[#8A8A82]">Clique em Novo Pagamento para registrar o primeiro.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F5] border-b border-[#E5E2D9] text-xs font-semibold text-[#8A8A82] uppercase tracking-wider">
                  <th className="p-4 whitespace-nowrap">Data</th>
                  <th className="p-4">Paciente</th>
                  <th className="p-4">Valor</th>
                  <th className="p-4">Método</th>
                  <th className="p-4 text-right">Recibo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2D9]">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-[#FDFCF9] transition-colors">
                    <td className="p-4 whitespace-nowrap text-sm text-[#3D3D39]">
                      {new Date(payment.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4 text-sm font-medium text-[#3D3D39]">
                      {payment.patient_name}
                      <div className="text-xs text-[#8A8A82] font-normal">{payment.description}</div>
                    </td>
                    <td className="p-4 text-sm font-semibold text-[#708A63]">
                      R$ {payment.amount.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="p-4 text-sm text-[#5A5A40]">
                      {payment.payment_method.replace('_', ' ')}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => generatePDF(payment)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#F2F0EA] text-[#5A5A40] text-xs font-medium rounded-md hover:bg-[#E5E2D9] transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Novo Pagamento */}
      {isNewPaymentOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E2D9] w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E5E2D9] bg-[#FAF9F5]">
              <h3 className="text-lg font-bold text-[#3D3D39]">Registrar Pagamento</h3>
              <button 
                onClick={() => setIsNewPaymentOpen(false)}
                className="p-1 text-[#8A8A82] hover:text-[#3D3D39] hover:bg-[#E5E2D9] rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSavePayment} className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#3D3D39] mb-1">Paciente</label>
                <select
                  required
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E5E2D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] text-sm"
                >
                  <option value="">Selecione um paciente...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#3D3D39] mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-white border border-[#E5E2D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#3D3D39] mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E5E2D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3D3D39] mb-1">Forma de Pagamento</label>
                <select
                  required
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-[#E5E2D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] text-sm"
                >
                  <option value="PIX">Pix</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                  <option value="CARTAO_DEBITO">Cartão de Débito</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="TRANSFERENCIA">Transferência Bancária</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3D3D39] mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Sessão de Psicoterapia"
                  className="w-full px-3 py-2 bg-white border border-[#E5E2D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewPaymentOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-[#5A5A40] bg-[#F2F0EA] hover:bg-[#E5E2D9] rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-[#5A5A40] hover:bg-[#4A4A35] rounded-lg transition-colors"
                >
                  Salvar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gerar Extrato */}
      {isStatementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E2D9] w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E5E2D9] bg-[#FAF9F5]">
              <h3 className="text-lg font-bold text-[#3D3D39]">Gerar Extrato por Período</h3>
              <button 
                onClick={() => setIsStatementModalOpen(false)}
                className="p-1 text-[#8A8A82] hover:text-[#3D3D39] hover:bg-[#E5E2D9] rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={generateStatementPDF} className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#3D3D39] mb-1">Paciente</label>
                <select
                  required
                  value={statementPatientId}
                  onChange={(e) => setStatementPatientId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E5E2D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] text-sm"
                >
                  <option value="">Selecione um paciente...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#3D3D39] mb-1">Data Inicial</label>
                  <input
                    type="date"
                    required
                    value={statementStartDate}
                    onChange={(e) => setStatementStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E5E2D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#3D3D39] mb-1">Data Final</label>
                  <input
                    type="date"
                    required
                    value={statementEndDate}
                    onChange={(e) => setStatementEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E5E2D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 focus:border-[#5A5A40] text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsStatementModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-[#5A5A40] bg-[#F2F0EA] hover:bg-[#E5E2D9] rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!statementPatientId}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#5A5A40] hover:bg-[#4A4A35] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Exportar PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
