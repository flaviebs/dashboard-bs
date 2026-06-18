"use client";
import React from "react";
import { useState, useEffect } from "react";

// ─── COULEURS BS ──────────────────────────────────────────────────────────────
const C = {
  brun:    "#2C1A0E",
  brunMid: "#5C3D1E",
  taupe:   "#8B7355",
  beige:   "#E8DDD0",
  lin:     "#F5F0E8",
  blanc:   "#FFFFFF",
  ok:      "#4A7C59",
  warn:    "#C17B2A",
};

// ─── PLAN DE RÉM ─────────────────────────────────────────────────────────────
const PALIERS_VENTE = [
  { label: "Certifiée",  min: 0,     max: 499,        taux: 20, garanti: null },
  { label: "Qualifiée",  min: 500,   max: 999,        taux: 22, garanti: 150  },
  { label: "Confirmée",  min: 1000,  max: 1999,       taux: 24, garanti: 300  },
  { label: "Experte",    min: 2000,  max: 2999,       taux: 26, garanti: 550  },
  { label: "Master",     min: 3000,  max: 4999,       taux: 31, garanti: null },
  { label: "Icône",      min: 5000,  max: 9999,       taux: 31, garanti: null },
  { label: "Légende",    min: 10000, max: Infinity,   taux: 31, garanti: null, bonus1pct: true },
];

const PALIERS_EQUIPE = [
  { label: "Consultante",         venteEquipe: 0,       horsLigne: 0,      structure: "—",            managers: 0, leaders: 0 },
  { label: "Consultante Senior",  venteEquipe: 1500,    horsLigne: 750,    structure: "1 Consultante", managers: 0, leaders: 0 },
  { label: "Manager",             venteEquipe: 3000,    horsLigne: 1500,   structure: "1 Consultante", managers: 0, leaders: 0 },
  { label: "Manager Senior",      venteEquipe: 6000,    horsLigne: 3000,   structure: "1 Cons. Senior",managers: 0, leaders: 0 },
  { label: "Leader",              venteEquipe: 12000,   horsLigne: 5000,   structure: "1 Manager",     managers: 1, leaders: 0 },
  { label: "Leader Senior",       venteEquipe: 25000,   horsLigne: 10000,  structure: "2 Managers*",   managers: 2, leaders: 0 },
  { label: "Directrice",          venteEquipe: 50000,   horsLigne: 15000,  structure: "3 Managers*",   managers: 3, leaders: 0 },
  { label: "Directrice Senior",   venteEquipe: 100000,  horsLigne: 40000,  structure: "3 Managers*",   managers: 3, leaders: 0 },
  { label: "Vice-Présidente",     venteEquipe: 250000,  horsLigne: 100000, structure: "3 Leaders*",    managers: 0, leaders: 3 },
  { label: "Présidente",          venteEquipe: 500000,  horsLigne: 250000, structure: "3 Leaders*",    managers: 0, leaders: 3 },
  { label: "Prés. Exécutive",     venteEquipe: 1000000, horsLigne: 500000, structure: "3 Leaders Sr*", managers: 0, leaders: 3 },
];

const TAUX_NIVEAUX: Record<string, number[]> = {
  "Consultante Senior":  [4,4,0,0,0,0],
  "Manager":             [7,7,7,0,0,0],
  "Manager Senior":      [7,7,7,4,0,0],
  "Leader":              [7,7,7,5,4,0],
  "Leader Senior":       [7,7,7,5,4,4],
  "Directrice":          [7,7,7,5,5,4],
  "Directrice Senior":   [7,7,7,5,5,4],
  "Vice-Présidente":     [7,7,7,5,5,4],
  "Présidente":          [7,7,7,5,5,4],
  "Prés. Exécutive":     [7,7,7,5,5,4],
};

const PRIMES_STABILITE: Record<string, number> = {
  "Manager": 100, "Manager Senior": 200, "Leader": 400,
  "Leader Senior": 600, "Directrice": 1000, "Directrice Senior": 1000,
  "Vice-Présidente": 1500, "Présidente": 2500, "Prés. Exécutive": 4000,
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getPalierVente(ca: number) {
  return PALIERS_VENTE.findIndex((p: any) => ca >= p.min && ca <= p.max);
}

function getPalierEquipe(caEquipe: number) {
  let idx = 0;
  for (let i = PALIERS_EQUIPE.length - 1; i >= 0; i--) {
    if (caEquipe >= PALIERS_EQUIPE[i].venteEquipe) { idx = i; break; }
  }
  return idx;
}

function calcCommission(ca: number, palier: number) {
  const p = PALIERS_VENTE[palier];
  if (!p) return 0;
  let comm;
  if (p.bonus1pct && ca > 10000) {
    // Légende : 31% sur les 10 000 premiers + 32% sur le reste
    comm = 10000 * 0.31 + (ca - 10000) * 0.32;
  } else {
    comm = ca * (p.taux / 100);
  }
  if (p.garanti) comm = Math.max(comm, p.garanti);
  return Math.round(comm);
}

function joursRestants(dateDebut: string, duree: number = 30) {
  const fin = new Date(dateDebut);
  fin.setDate(fin.getDate() + duree);
  fin.setHours(23, 59, 59);
  const diff = fin.getTime() - new Date().getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function boostActif(dateDebut: string) {
  return joursRestants(dateDebut) > 0;
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK = {
  prenom: "Sophie", nom: "Laurent",
  dateDebut: "2026-06-01",
  caPersonnel: 1340,
  caEquipe: 18500,
  horsLignePlusFort: 6200,
  lignePlusFort: { prenom: "Marie", nom: "Dupont", ca: 12300 },
  mois: "Juin 2026",
  recrues: [
    { id: 1, prenom: "Lucie", nom: "Martin", dateDebut: "2026-06-05", caCommissionnable: 650 },
    { id: 2, prenom: "Emma",  nom: "Bernard", dateDebut: "2026-05-25", caCommissionnable: 1200 },
  ],
  qualifieCommissionsEquipe: true,
};

// ─── COMPOSANTS UI ────────────────────────────────────────────────────────────
function Jauge({ value, max, color = C.brun, label, sublabel, showPct = true, lightText = false }: { value: number, max: number, color?: string, label: string, sublabel?: string, showPct?: boolean, lightText?: boolean }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 100;
  return (
    <div style={{ marginBottom: 18, userSelect: "none", WebkitUserSelect: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
        <span style={{ fontSize: 11, color: lightText ? "rgba(245,240,232,0.85)" : C.taupe, letterSpacing: "0.04em" }}>{label}</span>
        <span style={{ fontSize: 11, color: lightText ? "#FFFFFF" : C.brun, fontWeight: 700, background: "transparent" }}>{sublabel}</span>
      </div>
      <div style={{ height: 5, background: lightText ? "rgba(245,240,232,0.15)" : C.beige, borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: color, borderRadius: 3,
          transition: "width 1s cubic-bezier(.4,0,.2,1)",
        }} />
      </div>
      {showPct && (
        <div style={{ textAlign: "right", fontSize: 10, color: lightText ? "rgba(245,240,232,0.75)" : C.taupe, marginTop: 4 }}>{pct}%</div>
      )}
    </div>
  );
}

function Card({ children, style = {}, dark = false }: { children: React.ReactNode, style?: React.CSSProperties, dark?: boolean }) {
  return (
    <div style={{
      background: dark ? C.brun : C.blanc,
      borderRadius: 14,
      padding: "18px 18px",
      marginBottom: 12,
      boxShadow: "0 1px 8px rgba(44,26,14,0.07)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function Label({ children, light = false }: { children: React.ReactNode, light?: boolean }) {
  return (
    <div style={{
      fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
      color: light ? "rgba(245,240,232,0.6)" : C.taupe,
      marginBottom: 5, fontFamily: "Georgia, serif",
    }}>
      {children}
    </div>
  );
}

function Pill({ children, active }: { children: React.ReactNode, active: boolean }) {
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 20,
      fontSize: 10, letterSpacing: "0.06em",
      background: active ? C.brun : "transparent",
      color: active ? C.lin : C.taupe,
      border: `1px solid ${active ? C.brun : C.beige}`,
      marginRight: 5, marginBottom: 5,
    }}>{children}</span>
  );
}

// ─── ONGLET VENTE ─────────────────────────────────────────────────────────────
function OngletVente({ data }: { data: any }) {
  const idx = getPalierVente(data.caPersonnel);
  const palier = PALIERS_VENTE[idx];
  const next = PALIERS_VENTE[idx + 1];
  const commission = calcCommission(data.caPersonnel, idx);
  const versProchain = next ? next.min - data.caPersonnel : 0;

  return (
    <div>
      {/* Hero — position + commission */}
      <Card dark>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <Label light>Position ce mois</Label>
            <div style={{ fontSize: 28, color: C.lin, letterSpacing: "-0.01em" }}>{palier.label}</div>
            <div style={{ fontSize: 12, color: "rgba(245,240,232,0.55)", marginTop: 3 }}>
              {palier.taux}% de commission
              {palier.bonus1pct && " + 1% au-delà de 10 000€"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <Label light>Commission estimée</Label>
            <div style={{ fontSize: 28, color: C.lin }}>{commission.toLocaleString("fr-FR")} €</div>
            {palier.garanti && (
              <div style={{ fontSize: 10, color: "rgba(245,240,232,0.5)", marginTop: 2 }}>
                garanti {palier.garanti} €
              </div>
            )}
          </div>
        </div>
        {/* Jauge + % + message vers prochain palier */}
        {next && (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
              <span style={{ fontSize: 11, color: "rgba(245,240,232,0.85)", letterSpacing: "0.04em" }}>
                {data.caPersonnel.toLocaleString("fr-FR")} € CA personnel
              </span>
              <span style={{ fontSize: 11, color: "#FFFFFF", fontWeight: 700 }}>
                {Math.min(100, Math.round(((data.caPersonnel - palier.min) / (next.min - palier.min)) * 100))}%
              </span>
            </div>
            <div style={{ height: 5, background: "rgba(245,240,232,0.15)", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
              <div style={{
                height: "100%",
                width: `${Math.min(100, Math.round(((data.caPersonnel - palier.min) / (next.min - palier.min)) * 100))}%`,
                background: "rgba(245,240,232,0.8)", borderRadius: 3,
              }} />
            </div>
            <div style={{
              fontSize: 12, padding: "8px 12px",
              background: "rgba(255,255,255,0.1)",
              borderRadius: 8,
              display: "flex", justifyContent: "space-between",
            }}>
              <span style={{ color: "rgba(245,240,232,0.8)" }}>Plus que</span>
              <span style={{ color: "#FFFFFF", fontWeight: 700 }}>
                {versProchain.toLocaleString("fr-FR")} € pour atteindre {next.label} ({Math.min(100, Math.round(((next.min - data.caPersonnel) / (next.min - palier.min)) * 100))}% restant)
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Tableau des paliers */}
      <Card>
        <Label>Parcours</Label>
        <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 14 }}>
          {PALIERS_VENTE.map((p, i) => <Pill key={p.label} active={i === idx}>{p.label}</Pill>)}
        </div>
        {PALIERS_VENTE.map((p, i) => (
          <div key={p.label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "9px 0",
            borderBottom: i < PALIERS_VENTE.length - 1 ? `1px solid ${C.lin}` : "none",
            opacity: i < idx ? 0.4 : 1,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: i === idx ? C.brun : i < idx ? C.beige : C.beige,
                border: i === idx ? "none" : `1px solid ${C.beige}`,
              }} />
              <span style={{ fontSize: 13, color: i === idx ? C.brun : C.brunMid }}>{p.label}</span>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: C.taupe }}>
                {p.min === 0 ? "0" : p.min.toLocaleString("fr-FR")}
                {p.max === Infinity ? " €+" : ` – ${p.max.toLocaleString("fr-FR")} €`}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: i === idx ? C.brun : C.taupe, minWidth: 32, textAlign: "right" }}>
                {p.bonus1pct ? "31% + 1%" : `${p.taux}%`}
              </span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── ONGLET ÉQUIPE ────────────────────────────────────────────────────────────
function OngletEquipe({ data }: { data: any }) {
  const idx = getPalierEquipe(data.caEquipe);
  const palier = PALIERS_EQUIPE[idx];
  const next = PALIERS_EQUIPE[idx + 1];
  const caMinQualif = idx >= 4 ? 500 : 250;
  const qualifiee = data.caPersonnel >= caMinQualif;
  const taux = TAUX_NIVEAUX[palier.label] || [0,0,0,0,0,0];
  const primeStab = PRIMES_STABILITE[palier.label];

  return (
    <div>
      <Card dark>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <Label light>Statut équipe</Label>
            <div style={{ fontSize: 24, color: C.lin }}>{palier.label}</div>
            <div style={{ fontSize: 11, color: "rgba(245,240,232,0.5)", marginTop: 3 }}>{palier.structure}</div>
          </div>
          <div style={{
            padding: "5px 12px", borderRadius: 20,
            background: qualifiee ? "rgba(245,240,232,0.15)" : "rgba(193,123,42,0.3)",
            color: qualifiee ? C.lin : "#F0B060",
            fontSize: 10, letterSpacing: "0.08em",
          }}>
            {qualifiee ? `✓ qualifiée (${caMinQualif} €)` : `min. ${caMinQualif} € requis`}
          </div>
        </div>
        <Jauge
          value={data.caEquipe}
          max={next ? next.venteEquipe : palier.venteEquipe}
          color="rgba(245,240,232,0.7)"
          label={`CA équipe — ${data.caEquipe.toLocaleString("fr-FR")} €`}
          lightText={true}
          showPct={true}
        />
        {next && (
          <div style={{
            fontSize: 12, marginTop: -8, marginBottom: 18,
            padding: "8px 12px",
            background: "rgba(255,255,255,0.1)",
            borderRadius: 8,
            display: "flex", justifyContent: "space-between",
          }}>
            <span style={{ color: "#FFFFFF", fontWeight: 700 }}>Plus que {(next.venteEquipe - data.caEquipe).toLocaleString("fr-FR")} € pour atteindre {next.label} ({Math.min(100, Math.round(((next.venteEquipe - data.caEquipe) / next.venteEquipe) * 100))}% restant)</span>
          </div>
        )}
        <Jauge
          value={data.horsLignePlusFort}
          max={next ? next.horsLigne : palier.horsLigne}
          color="rgba(139,115,85,0.8)"
          label={`Hors ligne forte — ${data.horsLignePlusFort.toLocaleString("fr-FR")} €`}
          lightText={true}
          showPct={true}
        />
        {next && (
          <div style={{
            fontSize: 12, marginTop: -8, marginBottom: 4,
            padding: "8px 12px",
            background: "rgba(255,255,255,0.1)",
            borderRadius: 8,
            display: "flex", justifyContent: "space-between",
          }}>
            <span style={{ color: "#FFFFFF", fontWeight: 700 }}>Plus que {(next.horsLigne - data.horsLignePlusFort).toLocaleString("fr-FR")} € pour atteindre {next.label} ({Math.min(100, Math.round(((next.horsLigne - data.horsLignePlusFort) / next.horsLigne) * 100))}% restant)</span>
          </div>
        )}
      </Card>

      {/* Ligne la plus forte */}
      <Card>
        <Label>Ligne la plus forte</Label>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 15, color: C.brun }}>
              {data.lignePlusFort.prenom} {data.lignePlusFort.nom}
            </div>
            <div style={{ fontSize: 11, color: C.taupe, marginTop: 2 }}>
              CA branche : {data.lignePlusFort.ca.toLocaleString("fr-FR")} €
            </div>
          </div>
          <div style={{
            background: C.lin, borderRadius: 10, padding: "8px 14px",
            fontSize: 11, color: C.taupe, textAlign: "center",
          }}>
            exclue du<br />calcul qualif
          </div>
        </div>
      </Card>

      {/* Commissions par niveau */}
      <Card>
        <Label>Mes commissions par niveau</Label>
        <div style={{ display: "flex", gap: 0 }}>
          {[1,2,3,4,5,6].map((n, i) => (
            <div key={n} style={{
              flex: 1, textAlign: "center",
              borderRight: i < 5 ? `1px solid ${C.lin}` : "none",
              padding: "10px 0",
            }}>
              <div style={{ fontSize: 9, color: C.taupe, letterSpacing: "0.1em", marginBottom: 6 }}>N{n}</div>
              <div style={{
                fontSize: 15, fontWeight: 700,
                color: taux[i] > 0 ? C.brun : C.beige,
              }}>
                {taux[i] > 0 ? `${taux[i]}%` : "—"}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Prime de stabilité */}
      {primeStab && (
        <Card style={{ background: C.lin }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <Label>Prime de stabilité</Label>
              <div style={{ fontSize: 13, color: C.brunMid }}>
                Maintenir le niveau {palier.label}
              </div>
            </div>
            <div style={{ fontSize: 22, color: C.brun, fontWeight: 700 }}>
              {primeStab} €
            </div>
          </div>
        </Card>
      )}

      {/* Prochain palier */}
      {next && (
        <Card style={{ background: C.lin }}>
          <Label>Pour atteindre {next.label}</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: C.taupe }}>CA équipe manquant</span>
              <span style={{ color: C.brun, fontWeight: 600 }}>
                {Math.max(0, next.venteEquipe - data.caEquipe).toLocaleString("fr-FR")} €
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: C.taupe }}>Hors ligne forte manquant</span>
              <span style={{ color: C.brun, fontWeight: 600 }}>
                {Math.max(0, next.horsLigne - data.horsLignePlusFort).toLocaleString("fr-FR")} €
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: C.taupe }}>Structure requise</span>
              <span style={{ color: C.brun, fontWeight: 600 }}>{next.structure}</span>
            </div>
            {next.structure && next.structure.includes("*") && (
              <div style={{
                fontSize: 10, color: C.taupe, marginTop: 12,
                paddingTop: 10, borderTop: `1px solid ${C.beige}`,
                fontStyle: "italic",
              }}>
                * doivent être dans des branches différentes
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── ONGLET BOOST ─────────────────────────────────────────────────────────────
function OngletBoost({ data }: { data: any }) {
  const actif = boostActif(data.dateDebut);
  const jours = joursRestants(data.dateDebut);
  const paliersAtteints = Math.floor(data.caPersonnel / 500);
  const primeCash = paliersAtteints * 25; // illimité
  const primeBons = Math.min(paliersAtteints, 8) * 50; // plafonné à 8 paliers
  const prochainPalier = (paliersAtteints + 1) * 500;
  const versProchain = prochainPalier - data.caPersonnel;

  if (!actif) return (
    <Card style={{ textAlign: "center", padding: "40px 20px" }}>
      <div style={{ fontSize: 28, marginBottom: 12, color: C.beige }}>✦</div>
      <div style={{ fontSize: 15, color: C.brun, marginBottom: 6 }}>Challenge Boost terminé</div>
      <div style={{ fontSize: 12, color: C.taupe }}>
        {primeCash} € de primes · {primeBons} € de bons cumulés
      </div>
    </Card>
  );

  return (
    <div>
      <Card dark>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Label light>Challenge Boost</Label>
            <div style={{ fontSize: 40, color: C.lin, lineHeight: 1 }}>{jours}</div>
            <div style={{ fontSize: 11, color: "rgba(245,240,232,0.5)", marginTop: 4 }}>jours restants</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <Label light>CA commissionnable</Label>
            <div style={{ fontSize: 24, color: C.lin }}>{data.caPersonnel.toLocaleString("fr-FR")} €</div>
            <div style={{ fontSize: 10, color: "rgba(245,240,232,0.4)", marginTop: 2 }}>
              {versProchain} € vers palier {paliersAtteints + 1}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <Jauge
            value={data.caPersonnel % 500}
            max={500}
            color="rgba(245,240,232,0.7)"
            label={`Palier ${paliersAtteints + 1}`}
            sublabel={`${versProchain} € restants`}
            showPct={false}
          />
        </div>
      </Card>

      {/* Paliers visuels */}
      <Card>
        <Label>Paliers atteints</Label>
        {/* Paliers illimités - on affiche tous les paliers atteints + le prochain */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {Array.from({ length: Math.max(paliersAtteints + 1, 8) }).map((_, i) => (
            <div key={i} style={{
              width: 36, height: 36, borderRadius: "50%",
              background: i < paliersAtteints ? C.brun : C.lin,
              border: `1px solid ${i < paliersAtteints ? C.brun : C.beige}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10,
              color: i < paliersAtteints ? C.lin : C.beige,
              fontWeight: i < paliersAtteints ? 700 : 400,
              position: "relative",
            }}>
              {i + 1}
              {i === 7 && (
                <div style={{
                  position: "absolute", top: -4, right: -4,
                  width: 10, height: 10, borderRadius: "50%",
                  background: C.taupe, fontSize: 6, color: C.lin,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>8</div>
              )}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: C.taupe, marginBottom: 14, textAlign: "center" }}>
          Bons d'achat : paliers 1 à 8 · Primes cash : illimitées
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, background: C.lin, borderRadius: 10, padding: "14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, color: C.brun, fontWeight: 700 }}>{primeCash} €</div>
            <div style={{ fontSize: 9, color: C.taupe, letterSpacing: "0.12em", marginTop: 4 }}>PRIMES CASH ∞</div>
          </div>
          <div style={{ flex: 1, background: C.lin, borderRadius: 10, padding: "14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, color: C.brun, fontWeight: 700 }}>{primeBons} €</div>
            <div style={{ fontSize: 9, color: C.taupe, letterSpacing: "0.12em", marginTop: 4 }}>BONS (max 8)</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── ONGLET SISTER BONUS ──────────────────────────────────────────────────────
function OngletSister({ data }: { data: any }) {
  const caMinQualif = 250; // simplifié, à adapter si Leader+
  const qualifiee = data.caPersonnel >= caMinQualif;

  return (
    <div>
      {!qualifiee && (
        <Card style={{ background: "#FFF8F0", border: `1px solid #E8C9A0` }}>
          <div style={{ fontSize: 12, color: C.warn }}>
            Minimum {caMinQualif} € de CA personnel pour toucher le Sister Bonus.
            Il vous manque {caMinQualif - data.caPersonnel} €.
          </div>
        </Card>
      )}

      {data.recrues.map((r: any) => {
        const actif = boostActif(r.dateDebut);
        const jours = joursRestants(r.dateDebut);
        const paliers = Math.min(Math.floor(r.caCommissionnable / 500), 8);
        const bonsGagnes = paliers * 25;
        const prochainPalier = (paliers + 1) * 500;

        return (
          <Card key={r.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, color: C.brun, marginBottom: 2 }}>
                  {r.prenom} {r.nom}
                </div>
                <div style={{ fontSize: 10, color: C.taupe }}>
                  Depuis le {new Date(r.dateDebut).toLocaleDateString("fr-FR")}
                </div>
              </div>
              <div style={{
                padding: "4px 10px", borderRadius: 20,
                background: actif ? C.brun : C.beige,
                color: actif ? C.lin : C.taupe,
                fontSize: 10,
              }}>
                {actif ? `${jours}j restants` : "Terminé"}
              </div>
            </div>

            {/* Paliers recrue - on affiche tous les paliers réels */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {Array.from({ length: Math.max(paliers + 1, 8) }).map((_, i) => (
                <div key={i} style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: i < paliers ? C.brun : C.lin,
                  border: `1px solid ${i < paliers ? C.brun : C.beige}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, color: i < paliers ? C.lin : C.beige,
                  fontWeight: i < paliers ? 700 : 400,
                  opacity: i >= 8 ? 1 : 1,
                  outline: i === 7 ? `2px solid ${C.taupe}` : "none",
                }}>
                  {i + 1}
                </div>
              ))}
            </div>
            {paliers > 8 && (
              <div style={{ fontSize: 10, color: C.taupe, marginBottom: 10, fontStyle: "italic" }}>
                ✦ {paliers - 8} palier{paliers - 8 > 1 ? "s" : ""} au-delà des 8 — bons acquis sur les 8 premiers uniquement
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: C.taupe }}>CA commissionnable</span>
              <span style={{ color: C.brun, fontWeight: 600 }}>{r.caCommissionnable.toLocaleString("fr-FR")} €</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: C.taupe }}>Paliers atteints</span>
              <span style={{ color: C.brun, fontWeight: 600 }}>
                {paliers}{paliers > 8 ? ` (dont ${paliers - 8} hors bons)` : " / 8"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: C.taupe }}>Mes bons gagnés</span>
              <span style={{ color: C.brun, fontWeight: 700 }}>{bonsGagnes} €</span>
            </div>

            {actif && paliers < 8 && (
              <div style={{
                marginTop: 12, background: C.lin, borderRadius: 8,
                padding: "8px 12px", fontSize: 11, color: C.taupe,
              }}>
                Encore {prochainPalier - r.caCommissionnable} € pour le palier {paliers + 1} (+25 € de bon)
              </div>
            )}
          </Card>
        );
      })}

      {data.recrues.length === 0 && (
        <Card style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 13, color: C.taupe }}>
            Aucune recrue en cours de boost
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }: { onLogin: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendCode = async () => {
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("code");
      } else {
        setError(data.error || "Erreur envoi email");
      }
    } catch {
      setError("Erreur réseau");
    }
    setLoading(false);
  };

  const verifyCode = async () => {
    if (!code) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("bs_token", data.token);
        localStorage.setItem("bs_email", data.email);
        onLogin(data.email);
      } else {
        setError(data.error || "Code incorrect");
      }
    } catch {
      setError("Erreur réseau");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#F5F0E8",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Georgia, serif", padding: "20px",
    }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "#8B7355", textTransform: "uppercase", marginBottom: 12 }}>
            belles sœurs · france
          </div>
          <div style={{ fontSize: 26, color: "#2C1A0E" }}>Mon espace</div>
        </div>

        <div style={{ background: "white", borderRadius: 16, padding: "28px 24px", boxShadow: "0 2px 12px rgba(44,26,14,0.08)" }}>
          {step === "email" ? (
            <>
              <div style={{ fontSize: 14, color: "#5C3D1E", marginBottom: 20 }}>
                Entrez votre email pour recevoir un code de connexion.
              </div>
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendCode()}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10,
                  border: "1px solid #E8DDD0", fontSize: 14, marginBottom: 16,
                  fontFamily: "Georgia, serif", boxSizing: "border-box" as const,
                  outline: "none",
                }}
              />
              {error && <div style={{ color: "#C17B2A", fontSize: 12, marginBottom: 12 }}>{error}</div>}
              <button
                onClick={sendCode}
                disabled={loading || !email}
                style={{
                  width: "100%", padding: "13px", background: "#2C1A0E",
                  color: "white", border: "none", borderRadius: 10,
                  fontSize: 13, fontFamily: "Georgia, serif", cursor: "pointer",
                  opacity: loading || !email ? 0.6 : 1,
                  letterSpacing: "0.08em",
                }}
              >
                {loading ? "Envoi..." : "Recevoir mon code"}
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, color: "#5C3D1E", marginBottom: 8 }}>
                Code envoyé à <strong>{email}</strong>
              </div>
              <div style={{ fontSize: 12, color: "#8B7355", marginBottom: 20 }}>
                Vérifiez vos emails et entrez le code à 6 chiffres.
              </div>
              <input
                type="text"
                placeholder="000000"
                value={code}
                onChange={e => setCode(e.target.value)}
                onKeyDown={e => e.key === "Enter" && verifyCode()}
                maxLength={6}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10,
                  border: "1px solid #E8DDD0", fontSize: 24, marginBottom: 16,
                  fontFamily: "Georgia, serif", boxSizing: "border-box" as const,
                  textAlign: "center", letterSpacing: "0.3em",
                }}
              />
              {error && <div style={{ color: "#C17B2A", fontSize: 12, marginBottom: 12 }}>{error}</div>}
              <button
                onClick={verifyCode}
                disabled={loading || code.length < 6}
                style={{
                  width: "100%", padding: "13px", background: "#2C1A0E",
                  color: "white", border: "none", borderRadius: 10,
                  fontSize: 13, fontFamily: "Georgia, serif", cursor: "pointer",
                  opacity: loading || code.length < 6 ? 0.6 : 1,
                  letterSpacing: "0.08em",
                }}
              >
                {loading ? "Vérification..." : "Me connecter"}
              </button>
              <button
                onClick={() => { setStep("email"); setCode(""); setError(""); }}
                style={{
                  width: "100%", padding: "10px", background: "transparent",
                  color: "#8B7355", border: "none", fontSize: 12,
                  fontFamily: "Georgia, serif", cursor: "pointer", marginTop: 8,
                }}
              >
                ← Changer d'email
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("bs_token");
    const email = localStorage.getItem("bs_email");
    if (token && email) {
      setIsLoggedIn(true);
      setUserEmail(email);
    }
  }, []);

  const handleLogin = (email: string) => {
    setIsLoggedIn(true);
    setUserEmail(email);
  };

  const handleLogout = () => {
    localStorage.removeItem("bs_token");
    localStorage.removeItem("bs_email");
    setIsLoggedIn(false);
    setUserEmail("");
  };

  if (!isLoggedIn) return <LoginPage onLogin={handleLogin} />;

  const [tab, setTab] = useState("vente");
  const [caInput, setCaInput] = useState(MOCK.caPersonnel);
  const [caEquipeInput, setCaEquipeInput] = useState(MOCK.caEquipe);
  const [lignePlusFortInput, setLignePlusFortInput] = useState(MOCK.horsLignePlusFort);

  const data = { ...MOCK, caPersonnel: Number(caInput), caEquipe: Number(caEquipeInput), horsLignePlusFort: Number(lignePlusFortInput) };
  const boostVisible = boostActif(data.dateDebut);

  const tabs = [
    { key: "vente",   label: "Vente" },
    { key: "equipe",  label: "Équipe" },
    ...(boostVisible ? [{ key: "boost", label: "Challenge Boost" }] : []),
    { key: "sister",  label: "Sister Bonus" },
  ];

  return (
    <div style={{ background: C.lin, minHeight: "100vh", maxWidth: 430, margin: "0 auto", fontFamily: "Georgia, serif" }}>

      {/* HEADER */}
      <div style={{ background: C.brun, padding: "22px 18px 18px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "rgba(245,240,232,0.4)", textTransform: "uppercase", marginBottom: 3 }}>
          belles sœurs · france
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 22, color: C.lin }}>Bonjour, {data.prenom}</div>
            <div style={{ fontSize: 10, color: "rgba(245,240,232,0.4)", marginTop: 2 }}>{data.mois}</div>
          </div>
          <div
            onClick={handleLogout}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: C.brunMid,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, color: C.lin, letterSpacing: "0.05em",
              cursor: "pointer",
            }}
            title="Se déconnecter"
          >
            {data.prenom[0]}{data.nom[0]}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ background: C.blanc, display: "flex", borderBottom: `1px solid ${C.lin}`, position: "sticky", top: 68, zIndex: 9 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "13px 0",
            background: "none", border: "none",
            borderBottom: tab === t.key ? `2px solid ${C.brun}` : "2px solid transparent",
            color: tab === t.key ? C.brun : C.taupe,
            fontSize: 11, letterSpacing: "0.08em",
            cursor: "pointer", fontFamily: "Georgia, serif",
            transition: "all 0.2s",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* SIMULATEUR */}
      <div style={{ padding: "14px 14px 0" }}>
        <Card dark style={{ marginBottom: 14 }}>
          <Label light>Simuler</Label>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: "rgba(245,240,232,0.4)", marginBottom: 4, letterSpacing: "0.12em" }}>CA PERSONNEL</div>
              <input type="number" value={caInput} onChange={e => setCaInput(e.target.value)} style={{
                width: "100%", padding: "8px 10px", background: "rgba(255,255,255,0.08)",
                border: "none", borderRadius: 8, color: C.lin, fontSize: 14,
                fontFamily: "Georgia, serif", boxSizing: "border-box",
              }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: "rgba(245,240,232,0.4)", marginBottom: 4, letterSpacing: "0.12em" }}>CA ÉQUIPE</div>
              <input type="number" value={caEquipeInput} onChange={e => setCaEquipeInput(e.target.value)} style={{
                width: "100%", padding: "8px 10px", background: "rgba(255,255,255,0.08)",
                border: "none", borderRadius: 8, color: C.lin, fontSize: 14,
                fontFamily: "Georgia, serif", boxSizing: "border-box",
              }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: "rgba(245,240,232,0.4)", marginBottom: 4, letterSpacing: "0.12em" }}>LIGNE LA + FORTE</div>
              <input type="number" value={lignePlusFortInput} onChange={e => setLignePlusFortInput(e.target.value)} style={{
                width: "100%", padding: "8px 10px", background: "rgba(255,255,255,0.08)",
                border: "none", borderRadius: 8, color: C.lin, fontSize: 14,
                fontFamily: "Georgia, serif", boxSizing: "border-box",
              }} />
            </div>
          </div>
        </Card>
      </div>

      {/* CONTENU */}
      <div style={{ padding: "0 14px 40px" }}>
        {tab === "vente"  && <OngletVente data={data} />}
        {tab === "equipe" && <OngletEquipe data={data} />}
        {tab === "boost"  && boostVisible && <OngletBoost data={data} />}
        {tab === "sister" && <OngletSister data={data} />}
      </div>

    </div>
  );
}
