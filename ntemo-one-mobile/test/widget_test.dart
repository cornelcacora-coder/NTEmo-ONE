import 'package:flutter_test/flutter_test.dart';
import 'package:ntemo_one_mobile/main.dart';

void main() {
  testWidgets('Smoke test pour NtemoOneApp', (WidgetTester tester) async {
    await tester.pumpWidget(const NtemoOneApp());
    expect(find.text('NTEMO ONE'), findsWidgets);
  });
}
