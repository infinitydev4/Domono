// Cette fonction Netlify servira de proxy pour les routes API dynamiques qui sont 
// désactivées lors de l'export statique
const { Resend } = require('resend');

// Initialiser Resend avec la clé API
let resend;
try {
  console.log("[NETLIFY FUNCTION] Initialisation de Resend avec la clé API");
  if (!process.env.RESEND_API_KEY) {
    console.error("[NETLIFY FUNCTION] ERREUR: RESEND_API_KEY n'est pas définie");
  } else {
    console.log("[NETLIFY FUNCTION] RESEND_API_KEY trouvée, longueur:", process.env.RESEND_API_KEY.length);
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log("[NETLIFY FUNCTION] Instance Resend créée avec succès");
  }
} catch (error) {
  console.error("[NETLIFY FUNCTION] Erreur d'initialisation de Resend:", error);
}

exports.handler = async function(event, context) {
  console.log("[NETLIFY FUNCTION] Requête reçue:", event.path, event.httpMethod);
  console.log("[NETLIFY FUNCTION] Headers:", JSON.stringify(event.headers));
  
  const path = event.path.replace('/.netlify/functions/api', '');
  const originalPath = event.path;
  console.log("[NETLIFY FUNCTION] Chemin original:", originalPath);
  console.log("[NETLIFY FUNCTION] Chemin traité:", path);
  
  const segments = path.split('/').filter(Boolean);
  console.log("[NETLIFY FUNCTION] Segments de chemin:", segments);
  
  if (segments.length === 0) {
    console.log("[NETLIFY FUNCTION] Route non trouvée");
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Route non trouvée' })
    };
  }

  // Déterminer quelle API est appelée
  const apiType = segments[0]; // Par exemple: quotes, contact, admin, auth
  console.log("[NETLIFY FUNCTION] Type d'API:", apiType);
  
  try {
    let response;
    
    // Détecter les soumissions de formulaires
    const isQuoteSubmission = event.httpMethod === 'POST' && 
                           (apiType === 'quotes' || originalPath.includes('/quotes') || originalPath.includes('/api/quotes'));
    const isContactSubmission = event.httpMethod === 'POST' && 
                           (apiType === 'contact' || originalPath.includes('/contact') || originalPath.includes('/api/contact'));
    
    if (isQuoteSubmission) {
      console.log("[NETLIFY FUNCTION] Traitement d'une demande de devis (détecté par POST)");
      
      // Traiter la soumission de devis
      try {
        // Récupérer les données du corps de la requête
        let body;
        try {
          body = JSON.parse(event.body);
          console.log("[NETLIFY FUNCTION] Données du formulaire reçues:", JSON.stringify(body, null, 2));
        } catch (parseError) {
          console.error("[NETLIFY FUNCTION] Erreur lors du parsing du corps de la requête:", parseError);
          console.log("[NETLIFY FUNCTION] Corps de la requête brut:", event.body);
          throw new Error("Impossible de parser les données du formulaire");
        }
        
        // Vérifier si Resend est disponible
        if (!resend) {
          console.error("[NETLIFY FUNCTION] Service d'email non disponible (resend est null)");
          throw new Error("Service d'email non disponible");
        }
        
        // Générer un ID de devis unique
        const quoteId = `quote_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        console.log("[NETLIFY FUNCTION] ID de devis généré:", quoteId);
        
        try {
          // Préparer l'email
          const emailConfig = {
            from: 'Devis Domono <contact@domono.fr>',
            to: ['contact@domono.fr'], // Remplacer par l'email réel de réception
            subject: `Nouveau devis ${body.service} - ${body.lastName} ${body.firstName}`,
            html: generateQuoteEmailTemplate(body, quoteId),
            reply_to: body.email
          };
          
          console.log("[NETLIFY FUNCTION] Configuration de l'email préparée:", JSON.stringify({
            from: emailConfig.from,
            to: emailConfig.to,
            subject: emailConfig.subject,
            reply_to: emailConfig.reply_to
          }));
          
          // Envoyer l'email avec Resend
          console.log("[NETLIFY FUNCTION] Tentative d'envoi d'email...");
          const emailResult = await resend.emails.send(emailConfig);
          
          console.log("[NETLIFY FUNCTION] Email envoyé avec succès:", emailResult);
          
          response = {
            message: "Demande de devis créée avec succès",
            quote: {
              id: quoteId,
              service: body.service,
              firstName: body.firstName,
              lastName: body.lastName,
              email: body.email
            }
          };
          
          return {
            statusCode: 201,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify(response)
          };
        } catch (emailError) {
          console.error("[NETLIFY FUNCTION] Erreur lors de l'envoi de l'email:", emailError);
          throw emailError;
        }
      } catch (error) {
        console.error("[NETLIFY FUNCTION] Erreur lors de l'envoi du devis:", error);
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            error: "Erreur lors de l'envoi du devis", 
            message: error.message 
          })
        };
      }
    } else if (isContactSubmission) {
      console.log("[NETLIFY FUNCTION] Traitement d'un formulaire de contact (détecté par POST)");

      try {
        let body;
        try {
          body = JSON.parse(event.body);
          console.log("[NETLIFY FUNCTION] Données contact reçues:", JSON.stringify(body, null, 2));
        } catch (parseError) {
          console.error("[NETLIFY FUNCTION] Erreur lors du parsing du corps contact:", parseError);
          throw new Error("Impossible de parser les données du formulaire de contact");
        }

        if (!resend) {
          console.error("[NETLIFY FUNCTION] Service d'email non disponible (contact)");
          throw new Error("Service d'email non disponible");
        }

        const projectName = formatContactProject(body.project);

        const emailConfig = {
          from: 'Contact Domono <contact@domono.fr>',
          to: ['contact@domono.fr'],
          subject: `Nouvelle demande de contact - ${projectName} - ${body.lastName} ${body.firstName}`,
          html: generateContactEmailTemplate({
            ...body,
            projectName
          }),
          reply_to: body.email
        };

        console.log("[NETLIFY FUNCTION] Tentative d'envoi email contact...");
        const emailResult = await resend.emails.send(emailConfig);
        console.log("[NETLIFY FUNCTION] Email contact envoyé:", emailResult);

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
          },
          body: JSON.stringify({ message: "Message envoyé avec succès" })
        };
      } catch (error) {
        console.error("[NETLIFY FUNCTION] Erreur lors de l'envoi du contact:", error);
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            error: "Erreur lors de l'envoi du message",
            message: error.message 
          })
        };
      }
    } else if (apiType === 'quotes') {
      // Continuer avec le code existant pour d'autres requêtes quotes
      if (segments.length > 1) {
        // Gérer /api/quotes/[id]
        const quoteId = segments[1];
        response = {
          message: 'Site en mode statique',
          info: `Les détails du devis ${quoteId} ne sont pas disponibles en mode statique.`,
          redirect: 'Veuillez vous connecter via l\'application principale.'
        };
      } else {
        // Gérer /api/quotes (GET)
        response = {
          message: 'Site en mode statique',
          info: 'La liste des devis n\'est pas disponible en mode statique.',
          redirect: 'Veuillez vous connecter via l\'application principale.'
        };
      }
    } else if (apiType === 'admin') {
      // Gérer /api/admin/...
      response = {
        message: 'Accès administrateur',
        info: 'Les fonctionnalités d\'administration ne sont pas disponibles en mode statique.',
        redirect: 'Veuillez vous connecter via l\'application principale.'
      };
    } else if (apiType === 'auth') {
      // Gérer /api/auth/...
      response = {
        message: 'Authentification',
        info: 'L\'authentification n\'est pas disponible en mode statique.',
        redirect: 'Veuillez vous connecter via l\'application principale.'
      };
    } else {
      response = {
        message: 'API non disponible',
        info: 'Cette fonctionnalité n\'est pas disponible en mode statique.',
        redirect: 'Veuillez nous contacter pour plus d\'informations.'
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(response)
    };
    
  } catch (error) {
    console.error("[NETLIFY FUNCTION] Erreur lors du traitement de la requête:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Erreur lors du traitement de la requête',
        message: error.message
      })
    };
  }
};

// Fonction pour générer un template d'email de devis
function generateQuoteEmailTemplate(formData, quoteId) {
  const date = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
  
  // Fonction pour formater le type de service
  const getServiceName = (service) => {
    const serviceName = service.toUpperCase();
    switch (serviceName) {
      case 'DOMOTIQUE': return 'Domotique';
      case 'ALARME': return 'Alarme';
      case 'VIDEOSURVEILLANCE': return 'Vidéosurveillance';
      case 'CONTROLE_ACCES': case 'CONTROLE-ACCES': return 'Contrôle d\'Accès';
      default: return service;
    }
  };
  
  // Générer les détails spécifiques au service
  let serviceDetailsHTML = '';
  const serviceName = getServiceName(formData.service);
  
  if (formData.service.toUpperCase() === 'DOMOTIQUE' || formData.domotiqueDetails) {
    const details = formData.domotiqueDetails || formData;
    serviceDetailsHTML = `
      <tr><td style="padding:8px;border-bottom:1px solid #eee;width:40%;color:#666;font-weight:600;">Type de logement:</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${details.propertyType === 'maison' ? 'Maison' : 'Appartement'}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;width:40%;color:#666;font-weight:600;">Surface:</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${details.surfaceArea ? `${details.surfaceArea} m²` : 'Non spécifiée'}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;width:40%;color:#666;font-weight:600;">Besoins:</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${formatBesoins(details)}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;width:40%;color:#666;font-weight:600;">Type de projet:</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${details.projectType === 'neuf' ? 'Projet neuf' : 'Rénovation'}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;width:40%;color:#666;font-weight:600;">Urgence:</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">
          ${details.urgency === 'immediate' ? 'Immédiat' : 
            details.urgency === '1-3months' ? '1 à 3 mois' : '3+ mois'}</td></tr>
    `;
  } else if (formData.service.toUpperCase() === 'ALARME' || formData.alarmeDetails) {
    const details = formData.alarmeDetails || formData;
    serviceDetailsHTML = `
      <tr><td style="padding:8px;border-bottom:1px solid #eee;width:40%;color:#666;font-weight:600;">Type de lieu:</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${formatLocationType(details.locationType)}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;width:40%;color:#666;font-weight:600;">Objectifs:</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${formatObjectifs(details)}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;width:40%;color:#666;font-weight:600;">Déjà équipé:</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${details.alreadyEquipped ? 'Oui' : 'Non'}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;width:40%;color:#666;font-weight:600;">Type de solution:</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${details.solutionType === 'economic' ? 'Solution économique' : 'Solution haut niveau'}</td></tr>
    `;
  } else if (formData.service.toUpperCase() === 'VIDEOSURVEILLANCE' || formData.videosurveillanceDetails) {
    const details = formData.videosurveillanceDetails || formData;
    serviceDetailsHTML = `
      <tr><td style="padding:8px;border-bottom:1px solid #eee;width:40%;color:#666;font-weight:600;">Nombre de caméras:</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${formatCameraCount(details.cameraCount)}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;width:40%;color:#666;font-weight:600;">Besoins spécifiques:</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${formatVideoBesoins(details)}</td></tr>
    `;
  } else if (formData.service.toUpperCase().includes('CONTROLE') || formData.controleAccesDetails) {
    const details = formData.controleAccesDetails || formData;
    serviceDetailsHTML = `
      <tr><td style="padding:8px;border-bottom:1px solid #eee;width:40%;color:#666;font-weight:600;">Type de bâtiment:</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${formatBuildingType(details.buildingType)}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;width:40%;color:#666;font-weight:600;">Points d'accès:</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${formatAccessPoints(details.accessPointCount)}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;width:40%;color:#666;font-weight:600;">Fonctionnalités:</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${formatControleBesoins(details)}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;width:40%;color:#666;font-weight:600;">Système existant:</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${details.existingSystem ? 'Oui' : 'Non'}</td></tr>
    `;
  }
  
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
      <div style="background-color:#f8f9fa;padding:24px;text-align:center;border-bottom:1px solid #eaeaea;">
        <h1 style="color:#FF6600;font-size:24px;font-weight:700;margin:0;">Nouvelle demande de devis</h1>
      </div>
      
      <div style="padding:24px;">
        <p style="font-size:16px;line-height:24px;color:#333333;margin-bottom:24px;">
          Un nouveau devis a été soumis sur le site Domono.fr le ${date}.
        </p>
        
        <div style="background-color:#f8f9fa;padding:12px 16px;border-radius:6px;margin-bottom:24px;display:flex;justify-content:space-between;">
          <span style="font-weight:600;color:#666666;">Référence du devis:</span>
          <span style="font-weight:700;color:#FF6600;font-size:16px;">${quoteId}</span>
        </div>
        
        <h2 style="font-size:18px;font-weight:600;color:#333333;margin-top:32px;margin-bottom:16px;border-bottom:1px solid #eaeaea;padding-bottom:8px;">
          Informations client
        </h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;width:40%;color:#666;font-weight:600;">Nom:</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${formData.lastName} ${formData.firstName}</td>
          </tr>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;width:40%;color:#666;font-weight:600;">Email:</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${formData.email}</td>
          </tr>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;width:40%;color:#666;font-weight:600;">Téléphone:</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${formData.phone}</td>
          </tr>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;width:40%;color:#666;font-weight:600;">Adresse:</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${formData.address}, ${formData.postalCode} ${formData.city}</td>
          </tr>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;width:40%;color:#666;font-weight:600;">Contact préféré:</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${formatContactMethod(formData.preferredContactMethod)}</td>
          </tr>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;width:40%;color:#666;font-weight:600;">Horaires préférés:</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${formatContactTime(formData.preferredContactTime)}</td>
          </tr>
        </table>
        
        <h2 style="font-size:18px;font-weight:600;color:#333333;margin-top:32px;margin-bottom:16px;border-bottom:1px solid #eaeaea;padding-bottom:8px;">
          Détails du service: ${serviceName}
        </h2>
        <table style="width:100%;border-collapse:collapse;">
          ${serviceDetailsHTML}
        </table>
        
        ${formData.additionalComments ? `
          <h2 style="font-size:18px;font-weight:600;color:#333333;margin-top:32px;margin-bottom:16px;border-bottom:1px solid #eaeaea;padding-bottom:8px;">
            Commentaires additionnels
          </h2>
          <div style="background-color:#f8f9fa;padding:16px;border-radius:6px;font-size:14px;line-height:22px;color:#333333;">
            ${formData.additionalComments}
          </div>
        ` : ''}
      </div>
      
      <div style="background-color:#f8f9fa;padding:24px;border-top:1px solid #eaeaea;font-size:12px;color:#666666;text-align:center;">
        <p>© ${new Date().getFullYear()} Domono • Tous droits réservés</p>
        <p>
          <a href="https://domono.fr" style="color:#FF6600;text-decoration:none;margin-left:8px;margin-right:8px;">domono.fr</a> • 
          <a href="mailto:contact@domono.fr" style="color:#FF6600;text-decoration:none;margin-left:8px;margin-right:8px;">contact@domono.fr</a>
        </p>
      </div>
    </div>
  `;
}

// Fonctions utilitaires pour le formatage
function formatBesoins(details) {
  const besoins = [];
  if (details.needLighting) besoins.push('Éclairage');
  if (details.needHeating) besoins.push('Chauffage/clim');
  if (details.needShutters) besoins.push('Volets roulants');
  if (details.needMultimedia) besoins.push('Audio/multimédia');
  if (details.needRemoteControl) besoins.push('Contrôle à distance');
  
  return besoins.length > 0 ? besoins.join(', ') : 'Non spécifiés';
}

function formatObjectifs(details) {
  const objectifs = [];
  if (details.needSonicDeterrence) objectifs.push('Dissuasion sonore');
  if (details.needConnectedAlarm) objectifs.push('Alarme connectée');
  if (details.needSmartphoneAlert) objectifs.push('Alerte smartphone');
  if (details.needSecurityIntervention) objectifs.push('Intervention sécurité');
  
  return objectifs.length > 0 ? objectifs.join(', ') : 'Non spécifiés';
}

function formatVideoBesoins(details) {
  const besoins = [];
  if (details.needNightVision) besoins.push('Vision nocturne');
  if (details.needCloudRecording) besoins.push('Enregistrement cloud');
  if (details.needLiveNotifications) besoins.push('Notifications en direct');
  
  return besoins.length > 0 ? besoins.join(', ') : 'Non spécifiés';
}

function formatControleBesoins(details) {
  const besoins = [];
  if (details.needBadgeCode) besoins.push('Badge / Code');
  if (details.needVideoIntercom) besoins.push('Interphone vidéo');
  if (details.needRemoteAccess) besoins.push('Accès à distance');
  if (details.needEntryHistory) besoins.push('Historique des entrées');
  
  return besoins.length > 0 ? besoins.join(', ') : 'Non spécifiés';
}

function formatLocationType(type) {
  switch (type) {
    case 'maison': return 'Maison';
    case 'appartement': return 'Appartement';
    case 'commerce': return 'Commerce';
    case 'bureau': return 'Bureau';
    default: return type;
  }
}

function formatBuildingType(type) {
  switch (type) {
    case 'residentiel': return 'Résidentiel';
    case 'bureau': return 'Bureau';
    case 'copropriete': return 'Copropriété';
    case 'commerce': return 'Commerce';
    default: return type;
  }
}

function formatCameraCount(count) {
  switch (count) {
    case '1': return '1 caméra';
    case '2-3': return '2 à 3 caméras';
    case '4+': return '4 caméras ou plus';
    default: return count;
  }
}

function formatAccessPoints(count) {
  switch (count) {
    case '1': return '1 point d\'accès';
    case '2-5': return '2 à 5 points d\'accès';
    case '5+': return 'Plus de 5 points d\'accès';
    default: return count;
  }
}

function formatContactMethod(method) {
  const methodUpper = method.toUpperCase();
  switch (methodUpper) {
    case 'EMAIL': return 'Email';
    case 'PHONE': return 'Téléphone';
    case 'ANY': return 'Email ou téléphone';
    default: return method;
  }
}

function formatContactTime(time) {
  const timeUpper = time.toUpperCase();
  switch (timeUpper) {
    case 'MORNING': return 'Matin';
    case 'AFTERNOON': return 'Après-midi';
    case 'EVENING': return 'Soir';
    case 'ANYTIME': return 'À tout moment';
    default: return time;
  }
}

function formatContactProject(project) {
  switch (project) {
    case 'eclairage': return 'Éclairage intelligent';
    case 'securite': return 'Sécurité & vidéosurveillance';
    case 'temperature': return 'Gestion de température';
    case 'complete': return 'Solution complète';
    case 'autre': return 'Autre projet';
    default: return project || 'Non spécifié';
  }
}

function generateContactEmailTemplate({ firstName, lastName, email, phone, projectName, message }) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #FF6600; margin-bottom: 20px;">Nouvelle demande de contact</h1>
      
      <p style="margin-bottom: 20px;">
        Une nouvelle demande de contact a été soumise sur le site Domono.fr.
      </p>
      
      <h2 style="color: #333; font-size: 18px; margin-top: 30px; padding-bottom: 8px; border-bottom: 1px solid #eaeaea;">
        Informations client
      </h2>
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">
          <strong style="display: inline-block; width: 140px;">Nom:</strong> ${lastName} ${firstName}
        </li>
        <li style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">
          <strong style="display: inline-block; width: 140px;">Email:</strong> ${email}
        </li>
        <li style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">
          <strong style="display: inline-block; width: 140px;">Téléphone:</strong> ${phone}
        </li>
        <li style="padding: 8px 0; border-bottom: 1px solid #eaeaea;">
          <strong style="display: inline-block; width: 140px;">Projet:</strong> ${projectName}
        </li>
      </ul>
      
      <h2 style="color: #333; font-size: 18px; margin-top: 30px; padding-bottom: 8px; border-bottom: 1px solid #eaeaea;">
        Message
      </h2>
      <div style="background-color: #f8f9fa; padding: 16px; border-radius: 6px; margin-top: 15px;">
        <p style="white-space: pre-wrap; margin: 0;">${message}</p>
      </div>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #666;">
        <p style="font-size: 12px;">© ${new Date().getFullYear()} Domono • Tous droits réservés</p>
      </div>
    </div>
  `;
}