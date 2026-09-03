import 'package:flutter/material.dart';
import '../services/app_update_service.dart';

class HomeScreen extends StatelessWidget {
  final Future<void> Function() onLogout;
  final VoidCallback onOpenChat;

  const HomeScreen({
    super.key,
    required this.onLogout,
    required this.onOpenChat,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff7f7f8),
      appBar: AppBar(
        backgroundColor: const Color(0xfff7f7f8),
        elevation: 0,
        scrolledUnderElevation: 0,
        titleSpacing: 8,
        leading: IconButton(
          tooltip: 'Menu',
          onPressed: () => _showMenu(context),
          icon: const Icon(Icons.menu_rounded),
        ),
        title: const Text(
          'Khobragade AI',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 20),
        ),
        actions: [
          IconButton(
            tooltip: 'New chat',
            onPressed: onOpenChat,
            icon: const Icon(Icons.edit_square),
          ),
          const SizedBox(width: 6),
        ],
      ),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 26),
          children: [
            const SizedBox(height: 30),
            Center(
              child: Container(
                width: 62,
                height: 62,
                decoration: const BoxDecoration(
                  color: Color(0xff10a37f),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.auto_awesome_rounded,
                  color: Colors.white,
                  size: 32,
                ),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'What can I help with?',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 28,
                height: 1.15,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.6,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Ask anything, create images, upload files or start a voice conversation.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                height: 1.45,
                color: Color(0xff6b6b6b),
              ),
            ),
            const SizedBox(height: 28),

            _messageBar(context),

            const SizedBox(height: 18),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 9,
              runSpacing: 9,
              children: [
                _promptChip(
                  icon: Icons.chat_bubble_outline_rounded,
                  label: 'Ask anything',
                  onTap: onOpenChat,
                ),
                _promptChip(
                  icon: Icons.image_outlined,
                  label: 'Create image',
                  onTap: onOpenChat,
                ),
                _promptChip(
                  icon: Icons.attach_file_rounded,
                  label: 'Upload file',
                  onTap: onOpenChat,
                ),
                _promptChip(
                  icon: Icons.graphic_eq_rounded,
                  label: 'Voice',
                  onTap: onOpenChat,
                ),
              ],
            ),

            const SizedBox(height: 34),
            const Text(
              'Quick actions',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),

            _actionTile(
              icon: Icons.add_comment_outlined,
              title: 'New chat',
              subtitle: 'Start a fresh conversation',
              onTap: onOpenChat,
            ),
            _actionTile(
              icon: Icons.system_update_alt_rounded,
              title: 'Check update',
              subtitle: 'Check for the latest Khobragade AI app',
              onTap: () => AppUpdateService.check(context, manual: true),
            ),
            _actionTile(
              icon: Icons.share_outlined,
              title: 'Share app',
              subtitle: 'Share Khobragade AI with others',
              onTap: AppUpdateService.shareApp,
            ),
          ],
        ),
      ),
    );
  }

  Widget _messageBar(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(28),
      child: InkWell(
        borderRadius: BorderRadius.circular(28),
        onTap: onOpenChat,
        child: Container(
          height: 58,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: const Color(0xffdedede)),
          ),
          child: const Row(
            children: [
              Icon(Icons.add_circle_outline_rounded, color: Color(0xff5f6368)),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Message Khobragade AI',
                  style: TextStyle(
                    color: Color(0xff6b6b6b),
                    fontSize: 15,
                  ),
                ),
              ),
              Icon(Icons.mic_none_rounded, color: Color(0xff5f6368)),
              SizedBox(width: 10),
              CircleAvatar(
                radius: 19,
                backgroundColor: Color(0xff111111),
                child: Icon(
                  Icons.graphic_eq_rounded,
                  color: Colors.white,
                  size: 22,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _promptChip({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return ActionChip(
      onPressed: onTap,
      avatar: Icon(icon, size: 18),
      label: Text(label),
      backgroundColor: Colors.white,
      side: const BorderSide(color: Color(0xffdedede)),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      labelStyle: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w500,
        color: Color(0xff333333),
      ),
    );
  }

  Widget _actionTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xffe4e4e4)),
      ),
      child: ListTile(
        minLeadingWidth: 38,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: const Color(0xfff2f2f2),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, size: 21, color: const Color(0xff222222)),
        ),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w650, fontSize: 15),
        ),
        subtitle: Text(
          subtitle,
          style: const TextStyle(fontSize: 12.5, color: Color(0xff777777)),
        ),
        trailing: const Icon(Icons.chevron_right_rounded),
        onTap: onTap,
      ),
    );
  }

  void _showMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 4, 12, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const ListTile(
                leading: CircleAvatar(
                  backgroundColor: Color(0xff10a37f),
                  child: Icon(Icons.auto_awesome_rounded, color: Colors.white),
                ),
                title: Text(
                  'Khobragade AI',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle: Text('User account'),
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.system_update_alt_rounded),
                title: const Text('Check update'),
                onTap: () {
                  Navigator.pop(sheetContext);
                  AppUpdateService.check(context, manual: true);
                },
              ),
              ListTile(
                leading: const Icon(Icons.share_outlined),
                title: const Text('Share app'),
                onTap: () {
                  Navigator.pop(sheetContext);
                  AppUpdateService.shareApp();
                },
              ),
              ListTile(
                leading: const Icon(Icons.logout_rounded),
                title: const Text('Logout'),
                onTap: () async {
                  Navigator.pop(sheetContext);
                  await onLogout();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
