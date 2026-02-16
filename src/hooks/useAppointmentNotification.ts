import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUnit } from "@/contexts/UnitContext";
import { useMarketingSettings } from "@/hooks/useMarketingSettings";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

// Global flag to track if speech has been unlocked by user gesture
let speechUnlocked = false;

function unlockSpeechSynthesis() {
  if (speechUnlocked) return;
  if (!('speechSynthesis' in window)) return;
  
  // Create a silent utterance to unlock speech synthesis
  const utterance = new SpeechSynthesisUtterance('');
  utterance.volume = 0;
  utterance.lang = 'pt-BR';
  speechSynthesis.speak(utterance);
  speechUnlocked = true;
  console.log('[Notification] Speech synthesis unlocked by user gesture');
}

export function useAppointmentNotification() {
  const { currentUnitId } = useCurrentUnit();
  const { settings } = useMarketingSettings();
  const processedInsertIdsRef = useRef<Set<string>>(new Set());
  const processedUpdateKeysRef = useRef<Set<string>>(new Set());
  const settingsRef = useRef(settings);

  // Keep settings ref up to date to avoid stale closures
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Unlock speech synthesis on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      unlockSpeechSynthesis();
      // Remove listeners after first interaction
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    document.addEventListener('keydown', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  // Preload voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      speechSynthesis.getVoices();
      speechSynthesis.onvoiceschanged = () => {
        speechSynthesis.getVoices();
      };
    }
  }, []);

  useEffect(() => {
    if (!currentUnitId) return;

    console.log('[Notification] Subscribing to realtime for unit:', currentUnitId);

    const channel = supabase
      .channel('appointment-notifications')
      // Listen for new appointments
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `unit_id=eq.${currentUnitId}`,
        },
        async (payload) => {
          const newAppointment = payload.new as {
            id: string;
            client_name: string;
            barber_id: string | null;
            service_id: string | null;
            start_time: string;
            source: string | null;
          };

          console.log('[Notification] New appointment detected:', newAppointment.id, 'source:', newAppointment.source);

          // Only notify for WhatsApp appointments
          if (newAppointment.source !== 'whatsapp') {
            console.log('[Notification] Skipping: not a WhatsApp appointment');
            return;
          }

          // Avoid duplicate notifications
          if (processedInsertIdsRef.current.has(newAppointment.id)) return;
          processedInsertIdsRef.current.add(newAppointment.id);

          // Check if vocal notification is enabled (use ref for fresh value)
          if (!settingsRef.current?.vocal_notification_enabled) {
            console.log('[Notification] Skipping: vocal notification disabled');
            return;
          }

          // Fetch barber and service details
          let barberName = "um profissional";
          let serviceName = "um serviço";

          if (newAppointment.barber_id) {
            const { data: barber } = await supabase
              .from("barbers")
              .select("name")
              .eq("id", newAppointment.barber_id)
              .single();
            if (barber) barberName = barber.name;
          }

          if (newAppointment.service_id) {
            const { data: service } = await supabase
              .from("services")
              .select("name")
              .eq("id", newAppointment.service_id)
              .single();
            if (service) serviceName = service.name;
          }

          // Build notification message
          const date = new Date(newAppointment.start_time);
          const isToday = isSameDay(date, new Date());
          const dateText = isToday 
            ? "hoje" 
            : format(date, "d 'de' MMMM", { locale: ptBR });
          const timeText = format(date, "HH 'e' mm", { locale: ptBR });

          const message = `${newAppointment.client_name} agendou com ${barberName} o serviço ${serviceName} para ${dateText} às ${timeText}`;

          console.log('[Notification] Speaking:', message);
          speak(message);
        }
      )
      // Listen for status updates (confirmations and cancellations)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `unit_id=eq.${currentUnitId}`,
        },
        async (payload) => {
          const updatedAppointment = payload.new as {
            id: string;
            client_name: string;
            start_time: string;
            status: string;
            source: string | null;
          };
          const oldAppointment = payload.old as {
            status: string;
          };

          console.log('[Notification] Appointment updated:', updatedAppointment.id, 'status:', oldAppointment.status, '->', updatedAppointment.status, 'source:', updatedAppointment.source);

          // Only notify for WhatsApp appointments
          if (updatedAppointment.source !== 'whatsapp') {
            return;
          }

          const date = new Date(updatedAppointment.start_time);
          const timeText = format(date, "HH 'e' mm", { locale: ptBR });

          // === CONFIRMAÇÃO: status muda de pending para confirmed ===
          if (updatedAppointment.status === 'confirmed' && oldAppointment.status === 'pending') {
            const confirmKey = `confirm_${updatedAppointment.id}`;
            if (processedUpdateKeysRef.current.has(confirmKey)) return;
            processedUpdateKeysRef.current.add(confirmKey);

            if (!settingsRef.current?.vocal_confirmation_enabled) return;

            const message = `${updatedAppointment.client_name} confirmou presença para o agendamento das ${timeText}`;
            console.log('[Notification] Speaking confirmation:', message);
            speak(message);
            return;
          }

          // === CANCELAMENTO: status muda para cancelled ===
          if (updatedAppointment.status === 'cancelled' && oldAppointment.status !== 'cancelled') {
            const cancelKey = `cancel_${updatedAppointment.id}`;
            if (processedUpdateKeysRef.current.has(cancelKey)) return;
            processedUpdateKeysRef.current.add(cancelKey);

            if (!settingsRef.current?.vocal_cancellation_enabled) return;

            const message = `O agendamento de ${updatedAppointment.client_name} às ${timeText} foi cancelado`;
            console.log('[Notification] Speaking cancellation:', message);
            speak(message);
            return;
          }
        }
      )
      .subscribe((status) => {
        console.log('[Notification] Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUnitId]);
}

function speak(text: string) {
  if (!('speechSynthesis' in window)) {
    console.warn('[Notification] Web Speech API not supported');
    return;
  }

  // Cancel any ongoing speech
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = 1.0;
  utterance.volume = 0.8;

  // Try to select a Portuguese voice
  const voices = speechSynthesis.getVoices();
  const ptVoice = voices.find(v => v.lang.includes('pt-BR')) 
    || voices.find(v => v.lang.includes('pt'));
  if (ptVoice) {
    utterance.voice = ptVoice;
    console.log('[Notification] Using voice:', ptVoice.name);
  }

  utterance.onerror = (event) => {
    console.error('[Notification] Speech error:', event.error);
  };

  utterance.onend = () => {
    console.log('[Notification] Speech completed');
  };

  speechSynthesis.speak(utterance);
}
