'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { StepIndicator } from './ui/step-indicator'
import { ServiceSelection } from './steps/service-selection'
import { DomotiqueForm } from './services/domotique-form'
import { AlarmeForm } from './services/alarme-form'
import { VideosurveillanceForm } from './services/videosurveillance-form'
import { ControleAccesForm } from './services/controle-acces-form'
import { ContactInfo } from './steps/contact-info'
import { Summary } from './steps/summary'
import { Check, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormStepType, ServiceType, FormData, BaseFormData, Step } from './types'

// Configuration des étapes
const steps = [
  { id: 1, name: 'Services', description: 'Choix du service', title: 'Services' },
  { id: 2, name: 'Projet', description: 'Détails du projet', title: 'Projet' },
  { id: 3, name: 'Contact', description: 'Vos coordonnées', title: 'Contact' },
  { id: 4, name: 'Récapitulatif', description: 'Vérification finale', title: 'Récapitulatif' }
]

// Valeurs par défaut pour le formulaire de base
const defaultBaseFormData: BaseFormData = {
  service: 'domotique',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  postalCode: '',
  city: '',
  preferredContactMethod: 'email',
  preferredContactTime: 'anytime',
  additionalComments: ''
}

export default function Stepper() {
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [formData, setFormData] = useState<Partial<FormData>>(defaultBaseFormData)
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const formRef = useRef<HTMLDivElement>(null)

  // Fonction pour scroller vers le formulaire
  const scrollToForm = useCallback(() => {
    if (formRef.current) {
      const offset = 100 // Offset pour éviter que le header ne cache le formulaire
      const elementPosition = formRef.current.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }, [])

  // Scroller vers le formulaire au chargement initial
  useEffect(() => {
    // Petit délai pour s'assurer que le DOM est rendu
    const timer = setTimeout(() => {
      scrollToForm()
    }, 100)
    return () => clearTimeout(timer)
  }, [scrollToForm])

  // Scroller vers le formulaire à chaque changement d'étape
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToForm()
    }, 300) // Délai pour laisser l'animation se terminer
    return () => clearTimeout(timer)
  }, [currentStep, scrollToForm])

  // Mise à jour des données du formulaire
  const updateFormData = useCallback((data: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...data }))
  }, [])

  // Navigation entre les étapes
  const nextStep = useCallback(() => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1)
    }
  }, [currentStep])

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  // Gestion de la soumission du formulaire
  const handleSubmit = useCallback(async () => {
    try {
      setSubmissionStatus('idle');

      console.log('Données du formulaire:', formData);
      
      // Préparation des données selon le format attendu par l'API
      const apiFormData: any = {
        ...formData,
        // Convertir le service au format attendu par l'API (en majuscules)
        service: formData.service?.toUpperCase() as ServiceType,
        // Convertir les méthodes de contact au format attendu par l'API
        preferredContactMethod: formData.preferredContactMethod?.toUpperCase(),
        preferredContactTime: formData.preferredContactTime?.toUpperCase(),
      };

      // Préparer les détails spécifiques au service suivant le format attendu par l'API
      if (formData.service === 'domotique') {
        // Extraire les champs spécifiques à la domotique dans un objet séparé
        const { 
          propertyType, surfaceArea, needLighting, needHeating, 
          needShutters, needMultimedia, needRemoteControl, 
          projectType, budget, urgency 
        } = formData as any;
        
        apiFormData.domotiqueDetails = { 
          propertyType, surfaceArea, needLighting, needHeating, 
          needShutters, needMultimedia, needRemoteControl, 
          projectType, budget, urgency 
        };
      } else if (formData.service === 'alarme') {
        // Extraire les champs spécifiques à l'alarme
        const {
          locationType, needSonicDeterrence, needConnectedAlarm, 
          needSmartphoneAlert, needSecurityIntervention, alreadyEquipped, solutionType
        } = formData as any;
        
        apiFormData.alarmeDetails = {
          locationType, needSonicDeterrence, needConnectedAlarm, 
          needSmartphoneAlert, needSecurityIntervention, alreadyEquipped, solutionType
        };
      } else if (formData.service === 'videosurveillance') {
        // Extraire les champs spécifiques à la vidéosurveillance
        const {
          surveillanceLocation, cameraCount, needNightVision,
          needCloudRecording, needLiveNotifications, projectTiming
        } = formData as any;
        
        apiFormData.videosurveillanceDetails = {
          surveillanceLocation, cameraCount, needNightVision,
          needCloudRecording, needLiveNotifications, projectTiming
        };
      } else if (formData.service === 'controle-acces') {
        // Extraire les champs spécifiques au contrôle d'accès
        const {
          buildingType, accessPointCount, needBadgeCode, needVideoIntercom,
          needRemoteAccess, needEntryHistory, existingSystem
        } = formData as any;
        
        apiFormData.controleAccesDetails = {
          buildingType, accessPointCount, needBadgeCode, needVideoIntercom,
          needRemoteAccess, needEntryHistory, existingSystem
        };
      }

      console.log('Données API préparées:', apiFormData);

      // Envoi des données à l'API
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiFormData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Erreur lors de l\'envoi du formulaire:', data);
        throw new Error(data.error || 'Erreur lors de l\'envoi du formulaire');
      }
      
      console.log('Devis créé avec succès:', data);
      setSubmissionStatus('success');
    } catch (error) {
      console.error('Erreur de soumission:', error);
      setSubmissionStatus('error');
    }
  }, [formData]);

  // Rendu du formulaire spécifique au service
  const renderServiceForm = useCallback(() => {
    if (currentStep !== 2) return null;
    
    switch (formData.service) {
      case 'domotique':
        return (
          <DomotiqueForm 
            formData={formData} 
            updateFormData={updateFormData} 
            nextStep={nextStep} 
            prevStep={prevStep} 
          />
        );
      case 'alarme':
        return (
          <AlarmeForm 
            formData={formData} 
            updateFormData={updateFormData} 
            nextStep={nextStep} 
            prevStep={prevStep} 
          />
        );
      case 'videosurveillance':
        return (
          <VideosurveillanceForm 
            formData={formData} 
            updateFormData={updateFormData} 
            nextStep={nextStep} 
            prevStep={prevStep} 
          />
        );
      case 'controle-acces':
        return (
          <ControleAccesForm 
            formData={formData} 
            updateFormData={updateFormData} 
            nextStep={nextStep} 
            prevStep={prevStep} 
          />
        );
      default:
        return null;
    }
  }, [currentStep, formData, nextStep, prevStep, updateFormData]);

  // Rendu des étapes du formulaire
  const renderStep = useCallback(() => {
    switch (currentStep) {
      case 1:
        return (
          <ServiceSelection 
            formData={formData} 
            updateFormData={updateFormData} 
            nextStep={nextStep} 
          />
        );
      case 2:
        return renderServiceForm();
      case 3:
        return (
          <ContactInfo 
            formData={formData as FormData} 
            updateFormData={updateFormData} 
            nextStep={nextStep} 
            prevStep={prevStep} 
          />
        );
      case 4:
        return (
          <Summary 
            formData={formData} 
            prevStep={prevStep} 
            handleSubmit={handleSubmit} 
          />
        );
      default:
        return null;
    }
  }, [currentStep, formData, nextStep, prevStep, updateFormData, handleSubmit, renderServiceForm]);

  const resetForm = useCallback(() => {
    setSubmissionStatus('idle')
    setCurrentStep(1)
    setFormData(defaultBaseFormData)
  }, [])

  // Rendu du message de confirmation après soumission
  const renderSubmissionStatus = useCallback(() => {
    if (submissionStatus === 'success') {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="max-w-3xl mx-auto p-8 bg-white rounded-xl shadow-lg text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-green-700">Demande envoyée avec succès !</h2>
          <p className="text-gray-600 mb-8">
            Merci pour votre demande de devis. Notre équipe l'examinera et vous contactera dans les plus brefs délais.
            Un email de confirmation a été envoyé à l'adresse {formData.email}.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => window.location.href = '/'} variant="outline" className="px-6">
              Retour à l'accueil
            </Button>
            <Button onClick={resetForm} className="px-6 bg-orange-500 hover:bg-orange-600">
              Nouvelle demande
            </Button>
          </div>
        </motion.div>
      )
    }
    
    if (submissionStatus === 'error') {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="max-w-3xl mx-auto p-8 bg-white rounded-xl shadow-lg text-center"
        >
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-red-700">Une erreur est survenue</h2>
          <p className="text-gray-600 mb-8">
            Nous n'avons pas pu envoyer votre demande de devis. Veuillez réessayer ou nous contacter directement.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => setSubmissionStatus('idle')} variant="outline" className="px-6">
              Retour au formulaire
            </Button>
            <Button onClick={() => window.location.href = '/contact'} className="px-6 bg-orange-500 hover:bg-orange-600">
              Nous contacter
            </Button>
          </div>
        </motion.div>
      )
    }
    
    return null
  }, [formData.email, resetForm, submissionStatus])

  return (
    <div className="py-8 md:py-12 px-4 max-w-6xl mx-auto">
      {submissionStatus === 'idle' ? (
        <>
          {/* Indicateur d'étapes */}
          <div className="mb-12">
            <StepIndicator steps={steps} currentStep={currentStep} onChange={setCurrentStep} />
          </div>
          
          {/* Container du formulaire avec animation */}
          <div ref={formRef} id="devis-form" className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8 mt-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      ) : (
        renderSubmissionStatus()
      )}
    </div>
  )
} 