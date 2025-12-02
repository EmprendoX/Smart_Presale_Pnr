"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "./ui/Card";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { useAuth } from "@/providers/AuthProvider";
import type { KycStatus } from "@/lib/types";

interface KycValidationProps {
  onStatusChange?: (status: KycStatus) => void;
}

export function KycValidation({ onStatusChange }: KycValidationProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    phone: "",
    address: "",
    idNumber: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simular validación KYC básica
      console.log('[KycValidation] Submitting KYC data for investor:', user?.id);
      
      // En un sistema real, aquí se enviarían los datos a un servicio de KYC
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Marcar como completo
      onStatusChange?.('complete');
      
      console.log('[KycValidation] KYC validation completed for investor');
    } catch (error) {
      console.error('[KycValidation] Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user?.kycStatus === 'complete') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-800">
                Verificación KYC Completa
              </h3>
              <p className="text-sm text-green-700">
                Tu identidad ha sido verificada exitosamente como inversionista.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-[color:var(--text-strong)]">
          Verificación de Identidad (KYC)
        </h3>
        <p className="text-sm text-[color:var(--text-muted)]">
          Completa tu verificación para acceder a todas las funciones como inversionista.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre Completo"
            type="text"
            required
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="Tu nombre completo"
          />
          
          <Input
            label="Teléfono"
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+52 55 1234 5678"
          />
          
          <Input
            label="Dirección"
            type="text"
            required
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Tu dirección completa"
          />
          
          <Input
            label="Número de Identificación"
            type="text"
            required
            value={formData.idNumber}
            onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
            placeholder="RFC, CURP o INE"
          />

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Esta es una validación KYC básica para inversionistas. 
              En un sistema de producción, se requeriría documentación adicional y verificación por terceros.
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Verificando..." : "Completar Verificación KYC"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}