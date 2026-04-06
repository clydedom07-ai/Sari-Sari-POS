<AuthProvider>
  <AuthGuard>
    <StoreProvider>
      <ReceiptProvider>
        <PWARegistration />
        <InstallPWA />
        {children}
      </ReceiptProvider>
    </StoreProvider>
  </AuthGuard>
</AuthProvider>
