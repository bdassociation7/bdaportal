/**
 * Grant Book Access Admin Page
 * Allows admins to manually grant book access to users
 * Use cases: complimentary access, partnerships, refunds, corrections, demos
 */

import { useState } from 'react';
import {
  BookPlus,
  User,
  Search,
  CheckCircle,
  XCircle,
  Calendar,
  FileText,
  Gift,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useGrantBookAccess, useRevokeBookAccess } from '@/entities/books';
import { useBookProducts } from '@/entities/book-products';
import { supabase } from '@/shared/config/supabase.config';
import type { GrantReason } from '@/entities/books/books.types';
import type { BookProduct } from '@/entities/book-products';

interface UserSearchResult {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export default function GrantBookAccessAdmin() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookProduct | null>(null);
  const [grantReason, setGrantReason] = useState<GrantReason>('complimentary');
  const [grantNotes, setGrantNotes] = useState('');
  const [accessUntil, setAccessUntil] = useState<string>('');
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [searchingUser, setSearchingUser] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);

  const { data: bookProducts, isLoading: loadingBooks } = useBookProducts();
  const grantBookMutation = useGrantBookAccess();
  const revokeBookMutation = useRevokeBookAccess();

  const t = {
    en: {
      title: 'Grant Book Access',
      description: 'Manually grant book access to users for complimentary access, partnerships, refunds, or corrections',
      searchUser: 'Search User',
      searchPlaceholder: 'Enter user email...',
      searchButton: 'Search',
      userSelected: 'User Selected',
      noUserSelected: 'No user selected',
      selectBook: 'Select Book',
      selectBookPlaceholder: 'Choose a book product...',
      grantReason: 'Grant Reason',
      grantReasonHint: 'Why are you granting this book?',
      reasonComplimentary: 'Complimentary (Free Gift)',
      reasonPartnership: 'Partnership Agreement',
      reasonRefund: 'Refund/Compensation',
      reasonCorrection: 'System Correction',
      reasonDemo: 'Demo/Testing',
      reasonOther: 'Other',
      notes: 'Notes',
      notesHint: 'Optional notes about this grant',
      accessPeriod: 'Access Period',
      accessUntil: 'Access Until',
      accessUntilHint: 'Leave empty for lifetime access',
      lifetimeAccess: 'Lifetime Access',
      grantAccess: 'Grant Book Access',
      cancel: 'Cancel',
      confirmGrant: 'Confirm Grant',
      confirmGrantTitle: 'Confirm Book Access Grant',
      confirmGrantDescription: 'Are you sure you want to grant this book access?',
      userLabel: 'User',
      bookLabel: 'Book',
      reasonLabel: 'Reason',
      expiryLabel: 'Expiry',
      success: 'Success',
      error: 'Error',
      bookGranted: 'Book access granted successfully',
      grantFailed: 'Failed to grant book access',
      userNotFound: 'User not found',
      searching: 'Searching...',
      noResults: 'No users found',
      loading: 'Loading books...',
      noBooks: 'No book products available',
      selectUserFirst: 'Please search and select a user first',
      selectBookFirst: 'Please select a book',
    },
    ar: {
      title: 'منح الوصول للكتب',
      description: 'منح الوصول للكتب يدويًا للمستخدمين للوصول المجاني أو الشراكات أو استرداد الأموال أو التصحيحات',
      searchUser: 'البحث عن مستخدم',
      searchPlaceholder: 'أدخل بريد المستخدم الإلكتروني...',
      searchButton: 'بحث',
      userSelected: 'تم اختيار المستخدم',
      noUserSelected: 'لم يتم اختيار مستخدم',
      selectBook: 'اختر كتاب',
      selectBookPlaceholder: 'اختر منتج كتاب...',
      grantReason: 'سبب المنح',
      grantReasonHint: 'لماذا تمنح هذا الكتاب؟',
      reasonComplimentary: 'مجاني (هدية)',
      reasonPartnership: 'اتفاقية شراكة',
      reasonRefund: 'استرداد/تعويض',
      reasonCorrection: 'تصحيح نظام',
      reasonDemo: 'تجربة/اختبار',
      reasonOther: 'أخرى',
      notes: 'ملاحظات',
      notesHint: 'ملاحظات اختيارية حول هذا المنح',
      accessPeriod: 'فترة الوصول',
      accessUntil: 'الوصول حتى',
      accessUntilHint: 'اتركه فارغًا للوصول مدى الحياة',
      lifetimeAccess: 'وصول مدى الحياة',
      grantAccess: 'منح الوصول للكتاب',
      cancel: 'إلغاء',
      confirmGrant: 'تأكيد المنح',
      confirmGrantTitle: 'تأكيد منح الوصول للكتاب',
      confirmGrantDescription: 'هل أنت متأكد أنك تريد منح هذا الوصول للكتاب؟',
      userLabel: 'المستخدم',
      bookLabel: 'الكتاب',
      reasonLabel: 'السبب',
      expiryLabel: 'انتهاء الصلاحية',
      success: 'نجح',
      error: 'خطأ',
      bookGranted: 'تم منح الوصول للكتاب بنجاح',
      grantFailed: 'فشل في منح الوصول للكتاب',
      userNotFound: 'المستخدم غير موجود',
      searching: 'جارٍ البحث...',
      noResults: 'لم يتم العثور على مستخدمين',
      loading: 'جارٍ تحميل الكتب...',
      noBooks: 'لا توجد منتجات كتب متاحة',
      selectUserFirst: 'يرجى البحث واختيار مستخدم أولاً',
      selectBookFirst: 'يرجى اختيار كتاب',
    },
  };

  const texts = t[language as keyof typeof t];

  // Search for user by email
  const handleSearchUser = async () => {
    if (!searchEmail.trim()) {
      toast({
        title: texts.error,
        description: texts.selectUserFirst,
        variant: 'destructive',
      });
      return;
    }

    setSearchingUser(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .ilike('email', `%${searchEmail}%`)
        .limit(10);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: texts.error,
          description: texts.userNotFound,
          variant: 'destructive',
        });
        setUserSearchResults([]);
        setSelectedUser(null);
      } else {
        setUserSearchResults(data as UserSearchResult[]);
        if (data.length === 1) {
          setSelectedUser(data[0] as UserSearchResult);
        }
      }
    } catch (error) {
      console.error('Failed to search user:', error);
      toast({
        title: texts.error,
        description: texts.userNotFound,
        variant: 'destructive',
      });
    } finally {
      setSearchingUser(false);
    }
  };

  // Handle grant book access
  const handleGrantAccess = () => {
    if (!selectedUser) {
      toast({
        title: texts.error,
        description: texts.selectUserFirst,
        variant: 'destructive',
      });
      return;
    }

    if (!selectedBook) {
      toast({
        title: texts.error,
        description: texts.selectBookFirst,
        variant: 'destructive',
      });
      return;
    }

    setShowGrantDialog(true);
  };

  const confirmGrant = async () => {
    if (!selectedUser || !selectedBook) return;

    try {
      await grantBookMutation.mutateAsync({
        user_id: selectedUser.id,
        product_id: selectedBook.woocommerce_product_id,
        grant_reason: grantReason,
        grant_notes: grantNotes.trim() || undefined,
        access_until: accessUntil || undefined,
      });

      toast({
        title: texts.success,
        description: texts.bookGranted,
      });

      // Reset form
      setShowGrantDialog(false);
      setSelectedUser(null);
      setSelectedBook(null);
      setGrantReason('complimentary');
      setGrantNotes('');
      setAccessUntil('');
      setSearchEmail('');
      setUserSearchResults([]);
    } catch (error: any) {
      toast({
        title: texts.error,
        description: error.message || texts.grantFailed,
        variant: 'destructive',
      });
    }
  };

  const activeBooks = bookProducts?.filter((b) => b.is_active) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BookPlus className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{texts.title}</h1>
        </div>
        <p className="text-muted-foreground">{texts.description}</p>
      </div>

      {/* Grant Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            {texts.grantAccess}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Search User */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {texts.searchUser}
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder={texts.searchPlaceholder}
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                className="flex-1"
              />
              <Button
                onClick={handleSearchUser}
                disabled={searchingUser}
                variant="secondary"
              >
                <Search className="h-4 w-4 mr-2" />
                {searchingUser ? texts.searching : texts.searchButton}
              </Button>
            </div>

            {/* User search results */}
            {userSearchResults.length > 0 && (
              <div className="space-y-2">
                {userSearchResults.map((user) => (
                  <Card
                    key={user.id}
                    className={`cursor-pointer transition-colors ${
                      selectedUser?.id === user.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{user.email}</div>
                        {(user.first_name || user.last_name) && (
                          <div className="text-sm text-muted-foreground">
                            {user.first_name} {user.last_name}
                          </div>
                        )}
                      </div>
                      {selectedUser?.id === user.id && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Selected user display */}
            {selectedUser && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <div className="font-medium">{selectedUser.email}</div>
                  {(selectedUser.first_name || selectedUser.last_name) && (
                    <div className="text-sm text-muted-foreground">
                      {selectedUser.first_name} {selectedUser.last_name}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedUser(null);
                    setUserSearchResults([]);
                  }}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Step 2: Select Book */}
          <div className="space-y-3">
            <Label>{texts.selectBook}</Label>
            <Select
              value={selectedBook?.id || ''}
              onValueChange={(value) => {
                const book = activeBooks.find((b) => b.id === value);
                setSelectedBook(book || null);
              }}
              disabled={!selectedUser}
            >
              <SelectTrigger>
                <SelectValue placeholder={texts.selectBookPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {loadingBooks ? (
                  <SelectItem value="loading" disabled>
                    {texts.loading}
                  </SelectItem>
                ) : activeBooks.length === 0 ? (
                  <SelectItem value="none" disabled>
                    {texts.noBooks}
                  </SelectItem>
                ) : (
                  activeBooks.map((book) => (
                    <SelectItem key={book.id} value={book.id}>
                      {book.product_name}
                      {book.language && ` (${book.language.toUpperCase()})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Step 3: Grant Details */}
          <div className="space-y-3">
            <Label>{texts.grantReason}</Label>
            <Select
              value={grantReason}
              onValueChange={(value) => setGrantReason(value as GrantReason)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="complimentary">{texts.reasonComplimentary}</SelectItem>
                <SelectItem value="partnership">{texts.reasonPartnership}</SelectItem>
                <SelectItem value="refund">{texts.reasonRefund}</SelectItem>
                <SelectItem value="correction">{texts.reasonCorrection}</SelectItem>
                <SelectItem value="demo">{texts.reasonDemo}</SelectItem>
                <SelectItem value="other">{texts.reasonOther}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">{texts.grantReasonHint}</p>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label>{texts.notes}</Label>
            <Textarea
              placeholder={texts.notesHint}
              value={grantNotes}
              onChange={(e) => setGrantNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Access Period */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {texts.accessPeriod}
            </Label>
            <Input
              type="date"
              value={accessUntil}
              onChange={(e) => setAccessUntil(e.target.value)}
              placeholder={texts.accessUntilHint}
            />
            <p className="text-sm text-muted-foreground">
              {accessUntil ? texts.accessUntil : texts.lifetimeAccess}
            </p>
          </div>

          {/* Grant Button */}
          <Button
            onClick={handleGrantAccess}
            disabled={!selectedUser || !selectedBook || grantBookMutation.isPending}
            className="w-full"
            size="lg"
          >
            <Gift className="h-4 w-4 mr-2" />
            {grantBookMutation.isPending ? texts.loading : texts.grantAccess}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{texts.confirmGrantTitle}</DialogTitle>
            <DialogDescription>{texts.confirmGrantDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div>
              <Label className="text-xs text-muted-foreground">{texts.userLabel}</Label>
              <div className="font-medium">{selectedUser?.email}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{texts.bookLabel}</Label>
              <div className="font-medium">{selectedBook?.product_name}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{texts.reasonLabel}</Label>
              <div className="font-medium capitalize">{grantReason}</div>
            </div>
            {accessUntil && (
              <div>
                <Label className="text-xs text-muted-foreground">{texts.expiryLabel}</Label>
                <div className="font-medium">{accessUntil}</div>
              </div>
            )}
            {grantNotes && (
              <div>
                <Label className="text-xs text-muted-foreground">{texts.notes}</Label>
                <div className="text-sm">{grantNotes}</div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrantDialog(false)}>
              {texts.cancel}
            </Button>
            <Button onClick={confirmGrant} disabled={grantBookMutation.isPending}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {texts.confirmGrant}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
