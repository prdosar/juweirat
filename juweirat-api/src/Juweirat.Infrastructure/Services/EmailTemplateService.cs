using System;
using System.Text;

namespace Juweirat.Infrastructure.Services;

public static class EmailTemplateService
{
    private const string BrandGreen = "#1B4332";
    private const string BrandGold = "#B08D57";
    private const string DarkGold = "#946E38";
    private const string BgLight = "#F6F3EE";
    private const string CardBg = "#FFFFFF";
    private const string TextColor = "#222725";
    private const string MutedColor = "#666055";
    private const string BorderColor = "#E6E0D6";

    public static string WrapInLuxuryLayout(string title, string preheader, string badgeText, string bodyContent, string? actionButtonText = null, string? actionButtonUrl = null)
    {
        var sb = new StringBuilder();
        sb.Append($@"<!DOCTYPE html>
<html lang=""fr"" xmlns=""http://www.w3.org/1999/xhtml"">
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
  <meta http-equiv=""X-UA-Compatible"" content=""IE=edge"">
  <title>{title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style=""margin: 0; padding: 0; background-color: {BgLight}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: {TextColor}; line-height: 1.5;"">
  <!-- Preheader text (preview in inbox) -->
  <div style=""display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: {BgLight};"">
    {preheader} &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table width=""100%"" border=""0"" cellpadding=""0"" cellspacing=""0"" style=""background-color: {BgLight}; padding: 28px 12px;"">
    <tr>
      <td align=""center"">
        <!-- Main Card Wrapper -->
        <table width=""100%"" border=""0"" cellpadding=""0"" cellspacing=""0"" style=""max-width: 600px; background-color: {CardBg}; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 24px rgba(27, 67, 50, 0.08); border: 1px solid {BorderColor};"">
          
          <!-- Top Accent Gold Line -->
          <tr>
            <td height=""4"" style=""background-color: {BrandGold}; font-size: 4px; line-height: 4px;"">&nbsp;</td>
          </tr>
          
          <!-- Header Banner -->
          <tr>
            <td align=""center"" style=""background-color: {BrandGreen}; padding: 28px 24px 24px 24px; text-align: center;"">
              <table border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"">
                <tr>
                  <td align=""center"">
                    <div style=""color: #D4AF37; font-size: 10px; font-weight: 800; letter-spacing: 3.5px; text-transform: uppercase; margin-bottom: 5px;"">RÉSIDENCE HÔTELIÈRE</div>
                    <div style=""color: #FFFFFF; font-size: 24px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; font-family: Georgia, serif;"">JUWEIRAT</div>
                    <div style=""color: rgba(255,255,255,0.75); font-size: 11.5px; margin-top: 3px; letter-spacing: 0.5px;"">Quartier Gbossimé, Lomé — TOGO</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Badge Bar -->
          <tr>
            <td align=""center"" style=""background-color: #FAF8F5; border-bottom: 1px solid {BorderColor}; padding: 9px 20px; text-align: center;"">
              <span style=""display: inline-block; font-size: 10.5px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: {DarkGold};"">
                {badgeText}
              </span>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style=""padding: 28px 28px 20px 28px;"">
              {bodyContent}
              
              {(string.IsNullOrEmpty(actionButtonText) ? "" : $@"
              <table width=""100%"" border=""0"" cellpadding=""0"" cellspacing=""0"" style=""margin-top: 26px; margin-bottom: 10px;"">
                <tr>
                  <td align=""center"">
                    <a href=""{actionButtonUrl ?? "https://juweirat.com"}"" style=""display: inline-block; background-color: {BrandGreen}; color: #FFFFFF; font-size: 13px; font-weight: 800; text-decoration: none; padding: 12px 28px; border-radius: 6px; letter-spacing: 0.8px; text-transform: uppercase; box-shadow: 0 2px 8px rgba(27,67,50,0.25);"">
                      {actionButtonText}
                    </a>
                  </td>
                </tr>
              </table>
              ")}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style=""background-color: #FAF8F5; border-top: 1px solid {BorderColor}; padding: 20px 24px; text-align: center;"">
              <p style=""margin: 0 0 5px 0; font-size: 12px; font-weight: 800; color: {BrandGreen};"">
                SCI JUWEIRAT — Résidence Hôtelière
              </p>
              <p style=""margin: 0 0 5px 0; font-size: 11px; color: {MutedColor};"">
                Quartier GBOSSIME, 08BP: 80859 · Lomé, TOGO · Tél : (+228) 90 00 00 00
              </p>
              <p style=""margin: 0; font-size: 10.5px; color: #8A8172;"">
                Email : <a href=""mailto:contact@juweirat.com"" style=""color: {BrandGold}; text-decoration: none; font-weight: 600;"">contact@juweirat.com</a> · 
                Site : <a href=""https://juweirat.com"" style=""color: {BrandGold}; text-decoration: none; font-weight: 600;"">www.juweirat.com</a>
              </p>
              <p style=""margin: 10px 0 0 0; font-size: 9.5px; color: #A0988A;"">
                Cet email a été envoyé automatiquement par la plateforme PMS de la Résidence Juweirat.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>");
        return sb.ToString();
    }

    public static string BuildBookingAdminNotification(string firstName, string lastName, string email, string phone, string nationality, string categoryName, DateOnly checkIn, DateOnly checkOut, int adults, int children, string? notes, bool fromAdmin = false)
    {
        var nights = (checkOut.ToDateTime(TimeOnly.MinValue) - checkIn.ToDateTime(TimeOnly.MinValue)).Days;
        var guestName = $"{firstName} {lastName}";
        var origineText = fromAdmin
            ? "Une nouvelle réservation vient d'être saisie à la réception depuis le back-office Juweirat."
            : "Une nouvelle demande de réservation a été enregistrée en ligne depuis le site web Juweirat.";
        var badgeText = fromAdmin ? "NOUVELLE RÉSERVATION — RÉCEPTION" : "NOUVELLE RÉSERVATION EN LIGNE";

        var body = $@"
        <h2 style=""margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: {BrandGreen};"">
          Nouvelle réservation reçue
        </h2>
        <p style=""margin: 0 0 20px 0; font-size: 13px; color: {MutedColor};"">
          {origineText}
        </p>

        <!-- Guest Details Card -->
        <div style=""background-color: #FAF8F5; border: 1px solid {BorderColor}; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px;"">
          <div style=""font-size: 10px; font-weight: 800; text-transform: uppercase; color: {BrandGold}; letter-spacing: 1px; margin-bottom: 6px;"">
            Coordonnées du Client
          </div>
          <div style=""font-size: 14.5px; font-weight: 800; color: {BrandGreen}; margin-bottom: 4px;"">
            {guestName}
          </div>
          <table border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""font-size: 12px; color: {TextColor};"">
            <tr>
              <td style=""padding: 2px 0; width: 80px; color: {MutedColor};"">Email :</td>
              <td style=""padding: 2px 0; font-weight: 600;""><a href=""mailto:{email}"" style=""color: {BrandGreen}; text-decoration: none;"">{email}</a></td>
            </tr>
            <tr>
              <td style=""padding: 2px 0; color: {MutedColor};"">Téléphone :</td>
              <td style=""padding: 2px 0; font-weight: 600;"">{phone}</td>
            </tr>
            {(string.IsNullOrEmpty(nationality) ? "" : $@"
            <tr>
              <td style=""padding: 2px 0; color: {MutedColor};"">Nationalité :</td>
              <td style=""padding: 2px 0;"">{nationality}</td>
            </tr>
            ")}
          </table>
        </div>

        <!-- Stay Details Card -->
        <div style=""background-color: #FAF8F5; border: 1px solid {BorderColor}; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px;"">
          <div style=""font-size: 10px; font-weight: 800; text-transform: uppercase; color: {BrandGold}; letter-spacing: 1px; margin-bottom: 6px;"">
            Détails du Séjour
          </div>
          <div style=""font-size: 13.5px; font-weight: 700; color: {BrandGreen}; margin-bottom: 6px;"">
            {categoryName}
          </div>
          <table border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""font-size: 12px; color: {TextColor};"">
            <tr>
              <td style=""padding: 3px 0; width: 100px; color: {MutedColor};"">Arrivée :</td>
              <td style=""padding: 3px 0; font-weight: 700;"">{checkIn:dd/MM/yyyy}</td>
            </tr>
            <tr>
              <td style=""padding: 3px 0; color: {MutedColor};"">Départ :</td>
              <td style=""padding: 3px 0; font-weight: 700;"">{checkOut:dd/MM/yyyy}</td>
            </tr>
            <tr>
              <td style=""padding: 3px 0; color: {MutedColor};"">Durée :</td>
              <td style=""padding: 3px 0; font-weight: 600;"">{nights} nuit{(nights > 1 ? "s" : "")}</td>
            </tr>
            <tr>
              <td style=""padding: 3px 0; color: {MutedColor};"">Occupants :</td>
              <td style=""padding: 3px 0;"">{adults} adulte{(adults > 1 ? "s" : "")}{(children > 0 ? $", {children} enfant(s)" : "")}</td>
            </tr>
          </table>
        </div>

        {(string.IsNullOrWhiteSpace(notes) ? "" : $@"
        <div style=""border-left: 3px solid {BrandGold}; background-color: #FCFBF9; padding: 10px 14px; border-radius: 0 6px 6px 0; margin-bottom: 16px;"">
          <div style=""font-size: 10px; font-weight: 800; text-transform: uppercase; color: {BrandGold}; margin-bottom: 3px;"">Notes & Demandes particulières</div>
          <div style=""font-size: 12px; color: {TextColor}; font-style: italic;"">{notes}</div>
        </div>
        ")}";

        return WrapInLuxuryLayout(
            title: $"Nouvelle réservation — {guestName}",
            preheader: $"Réservation reçue pour {guestName} du {checkIn:dd/MM/yyyy} au {checkOut:dd/MM/yyyy}",
            badgeText: badgeText,
            bodyContent: body,
            actionButtonText: "Accéder au PMS",
            actionButtonUrl: "http://localhost:3001/dashboard"
        );
    }

    public static string BuildBookingClientConfirmation(string firstName, string lastName, string categoryName, DateOnly checkIn, DateOnly checkOut, int adults, int children, bool fromAdmin = false)
    {
        var nights = (checkOut.ToDateTime(TimeOnly.MinValue) - checkIn.ToDateTime(TimeOnly.MinValue)).Days;
        var introText = fromAdmin
            ? "Nous vous confirmons l'enregistrement de votre réservation par notre équipe. Notre conciergerie prépare votre arrivée pour vous offrir un séjour d'exception à Lomé."
            : "Nous avons le plaisir de vous confirmer la prise en compte de votre demande de réservation. Notre conciergerie prépare votre arrivée pour vous offrir un séjour d'exception à Lomé.";
        var badgeText = fromAdmin ? "CONFIRMATION DE RÉSERVATION" : "CONFIRMATION DE DEMANDE";
        var titleText = fromAdmin ? "Confirmation de votre réservation" : "Votre réservation à la Résidence Juweirat";
        var preheaderText = fromAdmin
            ? $"Réservation confirmée pour le {checkIn:dd/MM/yyyy} à la Résidence Juweirat"
            : $"Demande de séjour reçue pour le {checkIn:dd/MM/yyyy} à la Résidence Juweirat";

        var body = $@"
        <h2 style=""margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: {BrandGreen};"">
          Bienvenue à la Résidence Juweirat, {firstName} !
        </h2>
        <p style=""margin: 0 0 18px 0; font-size: 13px; color: {MutedColor}; line-height: 1.5;"">
          {introText}
        </p>

        <!-- Stay Summary Box -->
        <div style=""background-color: #FAF8F5; border: 1px solid {BorderColor}; border-radius: 8px; padding: 16px; margin-bottom: 18px;"">
          <div style=""font-size: 10px; font-weight: 800; text-transform: uppercase; color: {BrandGold}; letter-spacing: 1px; margin-bottom: 8px;"">
            Récapitulatif de votre séjour
          </div>
          <div style=""font-size: 15px; font-weight: 800; color: {BrandGreen}; margin-bottom: 8px;"">
            {categoryName}
          </div>
          <table border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""font-size: 12.5px; color: {TextColor};"">
            <tr>
              <td style=""padding: 4px 0; width: 110px; color: {MutedColor};"">Date d'arrivée :</td>
              <td style=""padding: 4px 0; font-weight: 700; color: {BrandGreen};"">{checkIn:dddd dd MMMM yyyy}</td>
            </tr>
            <tr>
              <td style=""padding: 4px 0; color: {MutedColor};"">Date de départ :</td>
              <td style=""padding: 4px 0; font-weight: 700; color: {BrandGreen};"">{checkOut:dddd dd MMMM yyyy}</td>
            </tr>
            <tr>
              <td style=""padding: 4px 0; color: {MutedColor};"">Durée du séjour :</td>
              <td style=""padding: 4px 0; font-weight: 600;"">{nights} nuit{(nights > 1 ? "s" : "")}</td>
            </tr>
            <tr>
              <td style=""padding: 4px 0; color: {MutedColor};"">Voyageurs :</td>
              <td style=""padding: 4px 0;"">{adults} adulte{(adults > 1 ? "s" : "")}{(children > 0 ? $", {children} enfant(s)" : "")}</td>
            </tr>
          </table>
        </div>

        <!-- Amenities Highlight -->
        <div style=""background-color: #FFFFFF; border: 1px solid {BorderColor}; border-radius: 8px; padding: 14px 16px; margin-bottom: 18px;"">
          <div style=""font-size: 10px; font-weight: 800; text-transform: uppercase; color: {BrandGold}; letter-spacing: 0.8px; margin-bottom: 6px;"">
            Services &amp; Équipements Inclus
          </div>
          <div style=""font-size: 12px; color: {MutedColor}; line-height: 1.6;"">
            ✦ Wi-Fi très haut débit &nbsp;|&nbsp; ✦ Climatisation &nbsp;|&nbsp; ✦ Cuisine entièrement équipée &nbsp;|&nbsp; ✦ Sécurité 24h/24 &nbsp;|&nbsp; ✦ Parking privé
          </div>
        </div>

        <p style=""margin: 0; font-size: 12px; color: {MutedColor}; line-height: 1.5;"">
          Pour toute question ou demande particulière (transfert aéroport, petit-déjeuner), notre équipe reste à votre écoute par téléphone au <strong>(+228) 90 00 00 00</strong> ou par email à <a href=""mailto:contact@juweirat.com"" style=""color: {BrandGold}; text-decoration: none;"">contact@juweirat.com</a>.
        </p>";

        return WrapInLuxuryLayout(
            title: titleText,
            preheader: preheaderText,
            badgeText: badgeText,
            bodyContent: body,
            actionButtonText: "Découvrir la résidence",
            actionButtonUrl: "https://juweirat.com"
        );
    }

    public static string BuildContactAdminNotification(string name, string email, string phone, string subject, string message)
    {
        var body = $@"
        <h2 style=""margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: {BrandGreen};"">
          Nouveau message reçu
        </h2>
        <p style=""margin: 0 0 18px 0; font-size: 13px; color: {MutedColor};"">
          Un visiteur vous a contacté via le formulaire de contact du site web.
        </p>

        <!-- Sender Card -->
        <div style=""background-color: #FAF8F5; border: 1px solid {BorderColor}; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px;"">
          <div style=""font-size: 10px; font-weight: 800; text-transform: uppercase; color: {BrandGold}; letter-spacing: 1px; margin-bottom: 6px;"">
            Expéditeur
          </div>
          <div style=""font-size: 14.5px; font-weight: 800; color: {BrandGreen}; margin-bottom: 4px;"">
            {name}
          </div>
          <table border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""font-size: 12px; color: {TextColor};"">
            <tr>
              <td style=""padding: 2px 0; width: 80px; color: {MutedColor};"">Email :</td>
              <td style=""padding: 2px 0; font-weight: 600;""><a href=""mailto:{email}"" style=""color: {BrandGreen}; text-decoration: none;"">{email}</a></td>
            </tr>
            {(string.IsNullOrEmpty(phone) ? "" : $@"
            <tr>
              <td style=""padding: 2px 0; color: {MutedColor};"">Téléphone :</td>
              <td style=""padding: 2px 0; font-weight: 600;"">{phone}</td>
            </tr>
            ")}
            <tr>
              <td style=""padding: 2px 0; color: {MutedColor};"">Sujet :</td>
              <td style=""padding: 2px 0; font-weight: 700; color: {BrandGreen};"">{subject}</td>
            </tr>
          </table>
        </div>

        <!-- Message Box -->
        <div style=""border-left: 3px solid {BrandGold}; background-color: #FCFBF9; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 16px;"">
          <div style=""font-size: 10px; font-weight: 800; text-transform: uppercase; color: {BrandGold}; margin-bottom: 6px;"">Contenu du message</div>
          <div style=""font-size: 13px; color: {TextColor}; line-height: 1.6; white-space: pre-wrap;"">{message}</div>
        </div>";

        return WrapInLuxuryLayout(
            title: $"Message de contact : {subject}",
            preheader: $"Message de {name} : {subject}",
            badgeText: "MESSAGE DE CONTACT EN LIGNE",
            bodyContent: body,
            actionButtonText: "Répondre par email",
            actionButtonUrl: $"mailto:{email}?subject=Re: {Uri.EscapeDataString(subject)}"
        );
    }

    public static string BuildContactClientAcknowledgement(string name, string subject)
    {
        var body = $@"
        <h2 style=""margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: {BrandGreen};"">
          Merci pour votre message, {name}
        </h2>
        <p style=""margin: 0 0 16px 0; font-size: 13px; color: {MutedColor}; line-height: 1.6;"">
          Nous avons bien reçu votre demande concernant « <strong>{subject}</strong> ».
        </p>
        <div style=""background-color: #FAF8F5; border: 1px solid {BorderColor}; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px;"">
          <p style=""margin: 0; font-size: 12.5px; color: {TextColor}; line-height: 1.5;"">
            Notre équipe de conciergerie étudie votre demande avec la plus grande attention et vous répondra dans les plus brefs délais (sous 24h ouvrées).
          </p>
        </div>
        <p style=""margin: 0; font-size: 12px; color: {MutedColor};"">
          En cas d'urgence, vous pouvez également nous joindre directement par téléphone au <strong>(+228) 90 00 00 00</strong>.
        </p>";

        return WrapInLuxuryLayout(
            title: "Accusé de réception — Résidence Juweirat",
            preheader: $"Nous avons bien reçu votre message concernant : {subject}",
            badgeText: "ACCUSÉ DE RÉCEPTION",
            bodyContent: body,
            actionButtonText: "Visiter notre site",
            actionButtonUrl: "https://juweirat.com"
        );
    }

    public static string BuildPmsDailyClosing(string dateHotel, int nbArrivals, int nbDeparts, int nbNoShow, decimal caPassage, int occupiedRooms, decimal occupancyRate)
    {
        var body = $@"
        <h2 style=""margin: 0 0 6px 0; font-size: 18px; font-weight: 800; color: {BrandGreen};"">
          Feuille de Journée du {dateHotel}
        </h2>
        <p style=""margin: 0 0 18px 0; font-size: 12.5px; color: {MutedColor};"">
          Rapport automatique de clôture journalière et indicateurs d'exploitation PMS.
        </p>

        <!-- KPI Grid -->
        <table width=""100%"" border=""0"" cellpadding=""0"" cellspacing=""0"" style=""margin-bottom: 18px;"">
          <tr>
            <td width=""48%"" style=""background-color: #FAF8F5; border: 1px solid {BorderColor}; border-radius: 8px; padding: 12px 14px;"">
              <div style=""font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: {BrandGold}; letter-spacing: 0.8px;"">Arrivées du Jour</div>
              <div style=""font-size: 20px; font-weight: 900; color: {BrandGreen}; margin-top: 4px;"">{nbArrivals}</div>
            </td>
            <td width=""4%"">&nbsp;</td>
            <td width=""48%"" style=""background-color: #FAF8F5; border: 1px solid {BorderColor}; border-radius: 8px; padding: 12px 14px;"">
              <div style=""font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: {BrandGold}; letter-spacing: 0.8px;"">Départs du Jour</div>
              <div style=""font-size: 20px; font-weight: 900; color: {BrandGreen}; margin-top: 4px;"">{nbDeparts}</div>
            </td>
          </tr>
          <tr><td height=""8"" colspan=""3"" style=""line-height: 8px; font-size: 8px;"">&nbsp;</td></tr>
          <tr>
            <td width=""48%"" style=""background-color: #FAF8F5; border: 1px solid {BorderColor}; border-radius: 8px; padding: 12px 14px;"">
              <div style=""font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: {BrandGold}; letter-spacing: 0.8px;"">No-Shows</div>
              <div style=""font-size: 20px; font-weight: 900; color: {(nbNoShow > 0 ? "#9B1C1C" : BrandGreen)}; margin-top: 4px;"">{nbNoShow}</div>
            </td>
            <td width=""4%"">&nbsp;</td>
            <td width=""48%"" style=""background-color: #FAF8F5; border: 1px solid {BorderColor}; border-radius: 8px; padding: 12px 14px;"">
              <div style=""font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: {BrandGold}; letter-spacing: 0.8px;"">Taux d'occupation</div>
              <div style=""font-size: 20px; font-weight: 900; color: {BrandGreen}; margin-top: 4px;"">{occupancyRate:0.#}%</div>
            </td>
          </tr>
        </table>

        <!-- Revenue Highlight -->
        <div style=""background-color: #F4EFE6; border: 1.5px solid {BrandGreen}; border-radius: 8px; padding: 14px 18px; margin-bottom: 16px;"">
          <div style=""font-size: 10px; font-weight: 800; text-transform: uppercase; color: {BrandGreen}; letter-spacing: 0.8px;"">
            Chiffre d'Affaires Encaissé (Journée)
          </div>
          <div style=""font-size: 22px; font-weight: 900; color: {BrandGreen}; margin-top: 2px;"">
            {caPassage:N0} FCFA
          </div>
        </div>";

        return WrapInLuxuryLayout(
            title: $"Clôture Journalière — {dateHotel}",
            preheader: $"Feuille de journée du {dateHotel} : CA {caPassage:N0} FCFA",
            badgeText: "RAPPORT DE CLÔTURE JOURNALIÈRE",
            bodyContent: body,
            actionButtonText: "Consulter les Folios",
            actionButtonUrl: "http://localhost:3001/pms"
        );
    }

    public static string BuildContactReplyEmail(string senderName, string originalSubject, string originalMessage, string replyText)
    {
        var body = $@"
        <h2 style=""margin: 0 0 10px 0; font-size: 18px; font-weight: 800; color: {BrandGreen};"">
          Bonjour {senderName},
        </h2>
        <p style=""margin: 0 0 16px 0; font-size: 13.5px; color: {TextColor}; line-height: 1.6;"">
          Nous vous remercions pour votre prise de contact avec la <strong>Résidence Hôtelière Juweirat</strong>. Voici la réponse de notre équipe :
        </p>

        <!-- Reply text box -->
        <div style=""background-color: #FAF8F5; border-left: 4px solid {BrandGold}; border-radius: 4px; padding: 16px 18px; margin-bottom: 22px;"">
          <div style=""font-size: 13.5px; color: {TextColor}; line-height: 1.6; white-space: pre-wrap;"">{replyText}</div>
        </div>

        <!-- Original message recall -->
        <div style=""background-color: #F8F9FA; border: 1px solid {BorderColor}; border-radius: 6px; padding: 14px 16px; margin-bottom: 16px;"">
          <div style=""font-size: 10px; font-weight: 800; text-transform: uppercase; color: {MutedColor}; letter-spacing: 0.8px; margin-bottom: 4px;"">
            Rappel de votre message initial ({originalSubject})
          </div>
          <div style=""font-size: 12px; color: {MutedColor}; font-style: italic; line-height: 1.5;"">
            ""{originalMessage}""
          </div>
        </div>

        <p style=""margin: 0; font-size: 12.5px; color: {MutedColor}; line-height: 1.5;"">
          Pour toute information complémentaire, vous pouvez directement répondre à cet email ou nous joindre sur WhatsApp au <strong>+228 90 00 00 00</strong>.
        </p>";

        return WrapInLuxuryLayout(
            title: $"Réponse à votre message — Résidence Juweirat",
            preheader: $"Réponse de la Direction Juweirat concernant votre demande : {originalSubject}",
            badgeText: "RÉPONSE DE LA DIRECTION",
            bodyContent: body,
            actionButtonText: "Visiter le Site Web",
            actionButtonUrl: "https://juweirat.com"
        );
    }
}
