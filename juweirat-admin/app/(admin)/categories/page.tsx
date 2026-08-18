'use client';

import { useEffect, useRef, useState } from 'react';
import Header from '@/components/Header';
import { categories } from '@/lib/api';
import type { RoomCategoryDto, RoomImageDto } from '@/lib/types';
import {
  Camera,
  Edit3,
  GripVertical,
  ImagePlus,
  Layers,
  Star,
  Trash2,
  X,
  Check,
  ArrowLeft,
  ArrowRight,
  Upload,
  AlertCircle,
  Sparkles,
  Users,
  Building,
  DollarSign,
  Info,
} from 'lucide-react';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

function getImgSrc(filePath?: string | null): string {
  if (!filePath) return '/img/placeholder.jpg';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  return `${API_URL}${filePath}`;
}

const GAMME_COLORS: Record<string, string> = {
  standard: 'bg-blue-50 text-blue-700 border-blue-200',
  supérieure: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  privilège: 'bg-amber-50 text-amber-700 border-amber-200',
  suite: 'bg-purple-50 text-purple-700 border-purple-200',
};

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_WIDTH = 2000;
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

function resizeImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture du fichier échouée'));
    reader.onload = (e) => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('Décodage de l\'image échoué'));
      img.onload = () => {
        const { width, height } = img;
        let scale = 1;
        if (width > MAX_WIDTH) scale = Math.min(scale, MAX_WIDTH / width);
        if (file.size > MAX_BYTES) scale = Math.min(scale, Math.sqrt(MAX_BYTES / file.size));

        if (scale >= 1) {
          resolve(file);
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Compression échouée'));
              return;
            }
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
          },
          'image/jpeg',
          0.85,
        );
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function fmt(n?: number) {
  if (n === undefined || n === null) return '0';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
}

export default function CategoriesPage() {
  const [catList, setCatList] = useState<RoomCategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCat, setSelectedCat] = useState<RoomCategoryDto | null>(null);

  // Modal State
  const [activeTab, setActiveTab] = useState<'photos' | 'info'>('photos');
  const [categoryImages, setCategoryImages] = useState<RoomImageDto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Form State for Info tab
  const [form, setForm] = useState({
    nameFr: '',
    nameEn: '',
    descriptionFr: '',
    descriptionEn: '',
    pmsType: 'T1',
    pmsGamme: 'standard',
    capacityAdults: 2,
    capacityChildren: 0,
    tarifNuit: 30000,
    tarifN15: 13000,
    tarifN30: 10000,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await categories.getAll();
      setCatList(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des catégories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openEditModal = (cat: RoomCategoryDto, tab: 'photos' | 'info' = 'photos') => {
    setSelectedCat(cat);
    setActiveTab(tab);
    setCategoryImages(cat.images ? [...cat.images] : []);
    setForm({
      nameFr: cat.nameFr,
      nameEn: cat.nameEn,
      descriptionFr: cat.descriptionFr ?? '',
      descriptionEn: cat.descriptionEn ?? '',
      pmsType: cat.pmsType,
      pmsGamme: cat.pmsGamme,
      capacityAdults: cat.capacityAdults,
      capacityChildren: cat.capacityChildren,
      tarifNuit: cat.tarifNuit,
      tarifN15: cat.tarifN15,
      tarifN30: cat.tarifN30,
    });
    setUploadErr('');
    setSuccessMsg('');
  };

  const closeModal = () => {
    setSelectedCat(null);
    setSuccessMsg('');
    setUploadErr('');
  };

  // ── Photos Operations ──────────────────────────────────────────────────────

  const handleSetCover = async (imageId: number) => {
    if (!selectedCat) return;
    try {
      await categories.setCover(selectedCat.id, imageId);
      const updated = categoryImages.map((img) => ({
        ...img,
        isCover: img.id === imageId,
      }));
      setCategoryImages(updated);
      setSuccessMsg('Photo principale mise à jour avec succès');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadCategories();
    } catch (err: any) {
      setUploadErr(err.message || 'Erreur lors de la définition de la photo principale');
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!selectedCat) return;
    if (!confirm('Voulez-vous vraiment supprimer cette photo ?')) return;

    try {
      await categories.deleteImage(selectedCat.id, imageId);
      const updated = categoryImages.filter((img) => img.id !== imageId);
      if (updated.length > 0 && !updated.some((i) => i.isCover)) {
        updated[0].isCover = true;
      }
      setCategoryImages(updated);
      setSuccessMsg('Photo supprimée avec succès');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadCategories();
    } catch (err: any) {
      setUploadErr(err.message || 'Erreur lors de la suppression');
    }
  };

  const handleFilesUpload = async (files: FileList | File[]) => {
    if (!selectedCat || !files || files.length === 0) return;
    setUploading(true);
    setUploadErr('');

    try {
      const fileArray = Array.from(files);
      const uploadedList: RoomImageDto[] = [];

      for (const file of fileArray) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          throw new Error(`Format non supporté pour ${file.name}. Formats acceptés : JPG, PNG, WEBP`);
        }
        const resized = await resizeImage(file);
        const uploaded = await categories.uploadImage(selectedCat.id, resized);
        uploadedList.push(uploaded);
      }

      const combined = [...categoryImages, ...uploadedList];
      setCategoryImages(combined);
      setSuccessMsg(`${uploadedList.length} photo(s) ajoutée(s) avec succès`);
      setTimeout(() => setSuccessMsg(''), 3000);
      loadCategories();
    } catch (err: any) {
      setUploadErr(err.message || "Erreur lors de l'envoi des photos");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Drag and Drop Reordering ───────────────────────────────────────────────

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex || !selectedCat) return;

    const newOrder = [...categoryImages];
    const [moved] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, moved);

    // Update sortOrder values
    const updated = newOrder.map((img, idx) => ({ ...img, sortOrder: idx }));
    setCategoryImages(updated);
    setDraggedIndex(null);

    // Persist reordering
    try {
      const imageIds = updated.map((i) => i.id);
      await categories.reorderImages(selectedCat.id, imageIds);
      setSuccessMsg('Ordre des photos sauvegardé');
      setTimeout(() => setSuccessMsg(''), 2500);
      loadCategories();
    } catch (err: any) {
      setUploadErr("Erreur lors de l'enregistrement du nouvel ordre");
    }
  };

  const movePhoto = async (index: number, direction: 'left' | 'right') => {
    if (!selectedCat) return;
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categoryImages.length) return;

    const newOrder = [...categoryImages];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    const updated = newOrder.map((img, idx) => ({ ...img, sortOrder: idx }));
    setCategoryImages(updated);

    try {
      const imageIds = updated.map((i) => i.id);
      await categories.reorderImages(selectedCat.id, imageIds);
      setSuccessMsg('Ordre mis à jour');
      setTimeout(() => setSuccessMsg(''), 2500);
      loadCategories();
    } catch (err: any) {
      setUploadErr("Erreur lors de l'enregistrement de l'ordre");
    }
  };

  // ── Info Tab Save ──────────────────────────────────────────────────────────

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat) return;
    setSavingInfo(true);
    setError('');

    try {
      const updated = await categories.update(selectedCat.id, {
        pmsType: form.pmsType,
        pmsGamme: form.pmsGamme,
        nameFr: form.nameFr,
        nameEn: form.nameEn,
        descriptionFr: form.descriptionFr || null,
        descriptionEn: form.descriptionEn || null,
        capacityAdults: Number(form.capacityAdults),
        capacityChildren: Number(form.capacityChildren),
        tarifNuit: Number(form.tarifNuit),
        tarifN15: Number(form.tarifN15),
        tarifN30: Number(form.tarifN30),
      });

      setSelectedCat(updated);
      setSuccessMsg('Informations de la catégorie enregistrées');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadCategories();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement des informations");
    } finally {
      setSavingInfo(false);
    }
  };

  // Total summary calculations
  const totalCategories = catList.length;
  const totalPhotos = catList.reduce((acc, cat) => acc + (cat.images?.length ?? 0), 0);
  const totalRooms = catList.reduce((acc, cat) => acc + (cat.roomCount ?? 0), 0);

  return (
    <div className="flex flex-col min-h-full bg-gray-50/50">
      <Header title="Catégories d'Appartements & Photos" />

      <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Banner / Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-green/10 text-charcoal rounded-lg font-bold">
                <Layers size={18} />
              </span>
              <h2 className="text-xl font-bold text-charcoal">Gestion des Catégories & Vitrine Web</h2>
            </div>
            <p className="text-sm text-gray-500 max-w-3xl">
              Gérez les typologies d'appartements, organisez facilement l'ordre des photos par glisser-déposer,
              et définissez la photo principale affichée en tête de liste sur le site internet.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-100 text-center">
              <div className="text-xs text-gray-400 font-medium">Catégories</div>
              <div className="text-lg font-bold text-charcoal">{totalCategories}</div>
            </div>
            <div className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-100 text-center">
              <div className="text-xs text-gray-400 font-medium">Total Photos</div>
              <div className="text-lg font-bold text-green-700">{totalPhotos}</div>
            </div>
            <div className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-100 text-center">
              <div className="text-xs text-gray-400 font-medium">Appartements</div>
              <div className="text-lg font-bold text-charcoal">{totalRooms}</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Categories Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs animate-pulse space-y-4">
                <div className="h-48 bg-gray-200 rounded-xl w-full" />
                <div className="h-5 bg-gray-200 rounded-md w-3/4" />
                <div className="h-4 bg-gray-200 rounded-md w-1/2" />
                <div className="h-10 bg-gray-200 rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {catList.map((cat) => {
              const coverImg = cat.images?.find((i) => i.isCover)?.filePath || cat.images?.[0]?.filePath || cat.coverImage;
              const photoCount = cat.images?.length ?? 0;
              const gammeClass = GAMME_COLORS[cat.pmsGamme?.toLowerCase()] || 'bg-gray-50 text-gray-700 border-gray-200';

              return (
                <div
                  key={cat.id}
                  className="group bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden"
                >
                  {/* Photo Container */}
                  <div
                    onClick={() => openEditModal(cat, 'photos')}
                    className="relative h-52 w-full bg-gray-100 overflow-hidden cursor-pointer group-hover:opacity-95"
                  >
                    <Image
                      src={getImgSrc(coverImg)}
                      alt={cat.nameFr}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="font-mono text-[10px] font-bold text-white bg-charcoal/80 backdrop-blur-sm px-2.5 py-1 rounded-md border border-white/10">
                        {cat.pmsType}
                      </span>
                      <span className={`text-[10px] tracking-wider uppercase font-semibold px-2.5 py-1 rounded-md border ${gammeClass}`}>
                        {cat.pmsGamme}
                      </span>
                    </div>

                    {/* Photos Count Badge */}
                    <div className="absolute bottom-3 right-3 text-white text-[11px] font-medium bg-black/50 px-2.5 py-1 rounded-lg backdrop-blur-sm flex items-center gap-1.5 border border-white/10">
                      <Camera size={13} className="text-green" />
                      <span>{photoCount} {photoCount > 1 ? 'photos' : 'photo'}</span>
                    </div>

                    {/* Main Photo Indicator */}
                    <div className="absolute bottom-3 left-3 text-white text-[11px] font-medium bg-green/90 text-charcoal px-2.5 py-1 rounded-lg backdrop-blur-sm flex items-center gap-1 font-bold shadow-xs">
                      <Star size={12} className="fill-charcoal" />
                      <span>Photo Principale</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-lg text-charcoal group-hover:text-green-800 transition-colors">
                            {cat.nameFr}
                          </h3>
                          <p className="text-xs text-gray-400 italic">{cat.nameEn}</p>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
                          {cat.roomCount} {cat.roomCount > 1 ? 'appartements' : 'appartement'}
                        </span>
                      </div>

                      {cat.descriptionFr && (
                        <p className="mt-2 text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          {cat.descriptionFr}
                        </p>
                      )}

                      {/* Tarifs & Specs */}
                      <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-gray-50 p-2 rounded-lg">
                          <span className="text-[10px] text-gray-400 block font-medium">&lt; 15 nuits</span>
                          <span className="font-bold text-charcoal">{fmt(cat.tarifNuit)} F</span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-lg">
                          <span className="text-[10px] text-gray-400 block font-medium">15–29 nuits</span>
                          <span className="font-bold text-charcoal">{fmt(cat.tarifN15)} F</span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-lg">
                          <span className="text-[10px] text-gray-400 block font-medium">≥ 30 nuits</span>
                          <span className="font-bold text-charcoal">{fmt(cat.tarifN30)} F</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-gray-500 px-1">
                        <span className="flex items-center gap-1">
                          <Users size={13} className="text-gray-400" />
                          Max : {cat.capacityAdults} ad. {cat.capacityChildren > 0 ? `+ ${cat.capacityChildren} enf.` : ''}
                        </span>
                        <span className="font-mono text-[11px] text-gray-400">/{cat.slug}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(cat, 'photos')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-charcoal text-white hover:bg-charcoal/90 rounded-xl text-xs font-semibold transition-colors shadow-xs"
                      >
                        <Camera size={14} className="text-green" />
                        Gérer les photos ({photoCount})
                      </button>
                      <button
                        onClick={() => openEditModal(cat, 'info')}
                        title="Modifier les informations et tarifs"
                        className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs transition-colors"
                      >
                        <Edit3 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL ÉDITION & GESTION DES PHOTOS ───────────────────────────────── */}
      {selectedCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-charcoal text-green rounded-xl">
                  <Camera size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-charcoal">{selectedCat.nameFr}</h2>
                    <span className="font-mono text-[10px] font-bold text-charcoal bg-white border border-gray-200 px-2 py-0.5 rounded">
                      {selectedCat.pmsType} · {selectedCat.pmsGamme}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Configuration des photos pour la vitrine web et gestion des attributs
                  </p>
                </div>
              </div>

              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-charcoal hover:bg-gray-200 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-100 px-6 bg-white shrink-0">
              <button
                onClick={() => setActiveTab('photos')}
                className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'photos'
                    ? 'border-charcoal text-charcoal'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <Camera size={16} />
                Photos & Classement ({categoryImages.length})
              </button>
              <button
                onClick={() => setActiveTab('info')}
                className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'info'
                    ? 'border-charcoal text-charcoal'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <Edit3 size={16} />
                Informations & Tarifs
              </button>
            </div>

            {/* Notifications */}
            {successMsg && (
              <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <Check size={14} />
                {successMsg}
              </div>
            )}
            {uploadErr && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                {uploadErr}
              </div>
            )}

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeTab === 'photos' && (
                <div className="space-y-6">
                  {/* Instructions & Upload Area */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-charcoal flex items-center gap-1.5">
                        <Sparkles size={14} className="text-green" />
                        Ordre d'affichage sur le site web
                      </h4>
                      <p className="text-xs text-gray-500">
                        Glissez et déposez les cartes de photos pour réorganiser leur ordre.
                        La photo portant l'étoile <strong>« Principale »</strong> s'affiche en couverture sur le site.
                      </p>
                    </div>

                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => e.target.files && handleFilesUpload(e.target.files)}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-4 bg-green text-charcoal hover:bg-green/90 rounded-xl text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
                      >
                        <Upload size={15} />
                        {uploading ? 'Ajout en cours...' : 'Ajouter des photos'}
                      </button>
                    </div>
                  </div>

                  {/* Photos Grid with Drag & Drop */}
                  {categoryImages.length === 0 ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center hover:border-green transition-colors cursor-pointer bg-gray-50/50"
                    >
                      <ImagePlus size={36} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-sm font-semibold text-charcoal">Aucune photo pour cette catégorie</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Cliquez pour ajouter la première photo de cette catégorie.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {categoryImages.map((img, index) => {
                        const isMain = img.isCover || index === 0;

                        return (
                          <div
                            key={img.id}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            className={`group relative rounded-xl border-2 transition-all duration-200 flex flex-col bg-white overflow-hidden shadow-2xs ${
                              isMain
                                ? 'border-amber-400 ring-2 ring-amber-400/20'
                                : 'border-gray-200 hover:border-charcoal/40'
                            } ${draggedIndex === index ? 'opacity-40 scale-95' : 'opacity-100'}`}
                          >
                            {/* Image Thumbnail */}
                            <div className="relative aspect-4/3 w-full bg-gray-100 overflow-hidden cursor-grab active:cursor-grabbing">
                              <Image
                                src={getImgSrc(img.filePath)}
                                alt={`Photo ${index + 1}`}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                sizes="(max-width: 768px) 50vw, 25vw"
                              />

                              {/* Drag Indicator */}
                              <div className="absolute top-2 left-2 p-1 bg-black/50 text-white rounded-md backdrop-blur-xs opacity-70 group-hover:opacity-100 transition-opacity">
                                <GripVertical size={14} />
                              </div>

                              {/* Position Badge */}
                              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white rounded text-[10px] font-mono font-bold backdrop-blur-xs">
                                #{index + 1}
                              </div>

                              {/* Main Photo Badge */}
                              {isMain ? (
                                <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-400 text-charcoal font-bold text-[10px] rounded-md shadow-xs flex items-center gap-1">
                                  <Star size={11} className="fill-charcoal" />
                                  Principale
                                </div>
                              ) : null}
                            </div>

                            {/* Actions Bar */}
                            <div className="p-2 bg-gray-50/90 border-t border-gray-100 flex items-center justify-between gap-1 text-xs">
                              {/* Reorder Arrows */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => movePhoto(index, 'left')}
                                  title="Déplacer vers la gauche"
                                  className="p-1 rounded bg-white hover:bg-gray-200 disabled:opacity-30 text-gray-600 transition-colors border border-gray-200"
                                >
                                  <ArrowLeft size={12} />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === categoryImages.length - 1}
                                  onClick={() => movePhoto(index, 'right')}
                                  title="Déplacer vers la droite"
                                  className="p-1 rounded bg-white hover:bg-gray-200 disabled:opacity-30 text-gray-600 transition-colors border border-gray-200"
                                >
                                  <ArrowRight size={12} />
                                </button>
                              </div>

                              {/* Set as Cover / Delete buttons */}
                              <div className="flex items-center gap-1">
                                {!isMain && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetCover(img.id)}
                                    title="Définir comme photo principale"
                                    className="p-1 px-1.5 rounded bg-white hover:bg-amber-50 hover:text-amber-700 text-gray-500 font-medium text-[11px] transition-colors border border-gray-200 flex items-center gap-1"
                                  >
                                    <Star size={12} />
                                    <span className="hidden sm:inline">Couverture</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteImage(img.id)}
                                  title="Supprimer la photo"
                                  className="p-1 rounded bg-white hover:bg-red-50 hover:text-red-600 text-gray-400 transition-colors border border-gray-200"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'info' && (
                <form onSubmit={handleSaveInfo} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Nom de la catégorie (Français)
                      </label>
                      <input
                        type="text"
                        required
                        value={form.nameFr}
                        onChange={(e) => setForm({ ...form, nameFr: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-green"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Nom de la catégorie (Anglais)
                      </label>
                      <input
                        type="text"
                        required
                        value={form.nameEn}
                        onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-green"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Type PMS</label>
                      <select
                        value={form.pmsType}
                        onChange={(e) => setForm({ ...form, pmsType: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-green"
                      >
                        <option value="T1">T1 (Studio)</option>
                        <option value="T2">T2 (2 pièces)</option>
                        <option value="T3">T3 (3 pièces)</option>
                        <option value="T4">T4 (Suite)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Gamme PMS</label>
                      <select
                        value={form.pmsGamme}
                        onChange={(e) => setForm({ ...form, pmsGamme: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-green"
                      >
                        <option value="standard">Standard</option>
                        <option value="supérieure">Supérieure</option>
                        <option value="privilège">Privilège</option>
                        <option value="suite">Suite</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Description (Français)
                      </label>
                      <textarea
                        rows={3}
                        value={form.descriptionFr}
                        onChange={(e) => setForm({ ...form, descriptionFr: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-green"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Description (Anglais)
                      </label>
                      <textarea
                        rows={3}
                        value={form.descriptionEn}
                        onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-green"
                      />
                    </div>
                  </div>

                  {/* Capacités & Tarifs */}
                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-charcoal mb-3">Capacités & Grille Tarifaire</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">Capacité Adultes</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={form.capacityAdults}
                          onChange={(e) => setForm({ ...form, capacityAdults: Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">Capacité Enfants</label>
                        <input
                          type="number"
                          min={0}
                          max={10}
                          value={form.capacityChildren}
                          onChange={(e) => setForm({ ...form, capacityChildren: Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">Tarif &lt; 15 nuits (FCFA)</label>
                        <input
                          type="number"
                          step={500}
                          value={form.tarifNuit}
                          onChange={(e) => setForm({ ...form, tarifNuit: Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">Tarif 15–29 nuits (FCFA)</label>
                        <input
                          type="number"
                          step={500}
                          value={form.tarifN15}
                          onChange={(e) => setForm({ ...form, tarifN15: Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">Tarif ≥ 30 nuits (FCFA)</label>
                        <input
                          type="number"
                          step={500}
                          value={form.tarifN30}
                          onChange={(e) => setForm({ ...form, tarifN30: Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button
                      type="submit"
                      disabled={savingInfo}
                      className="py-2.5 px-6 bg-charcoal text-white hover:bg-charcoal/90 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shadow-xs"
                    >
                      {savingInfo ? 'Enregistrement...' : 'Enregistrer les informations'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-400">
              <span>Slug : {selectedCat.slug}</span>
              <button
                onClick={closeModal}
                className="py-1.5 px-4 bg-white border border-gray-200 hover:bg-gray-100 text-charcoal rounded-lg font-semibold transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
