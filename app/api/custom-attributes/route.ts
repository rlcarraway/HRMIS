import { NextRequest, NextResponse } from 'next/server';
import { serverStorage } from '@/lib/serverStorage';
import { generateId } from '@/lib/utils';
import { CustomAttribute } from '@/lib/types';
import { logConfigChange } from '@/lib/serverAuditLog';
import { authenticateApiRequest } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

// GET /api/custom-attributes - Get all custom attributes
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const auth = await authenticateApiRequest(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const attributes = await serverStorage.getCustomAttributes();

    return NextResponse.json({
      success: true,
      data: attributes,
    });
  } catch (error) {
    console.error('Error fetching custom attributes:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching custom attributes' },
      { status: 500 }
    );
  }
}

// POST /api/custom-attributes - Create new custom attribute
export async function POST(request: NextRequest) {
  try {
    // Only admins can create custom attributes
    const auth = await authenticateApiRequest(request, { requiredRole: 'admin' });
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, dataType, required } = body;

    // Validation
    if (!name || !dataType) {
      return NextResponse.json(
        { success: false, error: 'Name and data type are required' },
        { status: 400 }
      );
    }

    const newAttribute: CustomAttribute = {
      id: generateId(),
      name,
      dataType,
      required: !!required,
    };

    await serverStorage.addCustomAttribute(newAttribute);

    // Log the attribute creation
    logConfigChange(
      'config.attribute.create',
      `Created custom attribute: ${newAttribute.name}`,
      {
        userId: auth.user.email,
        userName: auth.user.name,
        userEmail: auth.user.email,
        success: true,
        details: {
          attributeId: newAttribute.id,
          attributeName: newAttribute.name,
          dataType: newAttribute.dataType,
          required: newAttribute.required,
          authType: auth.user.authType,
          clientId: auth.user.clientId,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: newAttribute,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating custom attribute:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while creating custom attribute' },
      { status: 500 }
    );
  }
}
